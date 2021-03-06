$(document).ready(initBookmarks);

var refreshEnabled = true;
var btOkCancel = { Ok: true, Cancel: false };

function initBookmarks()
{
	// If something happend Refresh the Trees
	chrome.bookmarks.onChanged.addListener(refreshTree);
	chrome.bookmarks.onChildrenReordered.addListener(refreshTree);
	chrome.bookmarks.onCreated.addListener(refreshTree);
	chrome.bookmarks.onImportEnded.addListener(refreshTree);
	chrome.bookmarks.onMoved.addListener(refreshTree);
	chrome.bookmarks.onRemoved.addListener(refreshTree);
	
	//Currently not supported.
	var ProgressiveRender = false;
	var ProgressiveUnload = false;
	
	//Check settings.
	localStorage.jsTree_theme = localStorage.jsTree_theme || "default";
	localStorage.jsTree_themeDots = localStorage.jsTree_themeDots || false;
	
	localStorage.jsTree_FaviconService = localStorage.jsTree_FaviconService || "chrome";
	
	//Set theme path.
	jQuery.jstree.THEMES_DIR = "libs/jstree/themes/";
	
	var treeSetup = {
		json: {
			progressive_render: ProgressiveRender,
			progressive_unload: ProgressiveUnload
		},
		
		contextmenu: {
			select_node: true,
			show_at_node: false,
			
			items: {
				create: {
					separator_before: false,
					separator_after: true,
					
					icon: false,
					label: "Create",
					action: function (data) {
						var inst = $.jstree._reference(data.reference);
						var obj = inst.get_node(data.reference);
						var nodeData = obj.data();
						
						var create = function(v,m,f) {
							if(v !== true || f.newTitle == null || f.newTitle == "")
								return;
							
							var newBookmark = {
								title: f.newTitle
							};
							
							if(nodeData.chromeNode.url) {
								newBookmark.parentId = nodeData.chromeNode.parentId;
							} else {
								newBookmark.parentId = nodeData.chromeNode.id;
							}
							
							if(f.newUrl != null && f.newUrl != "")
								newBookmark.url = normalizeUrl(f.newUrl);
							
							//TODO use jstree.create_node() instead of refreshTree
							
							chrome.bookmarks.create(newBookmark, refreshTree);
						};
						
						var txt = 'Title:<br />' +
							'<input type="text" id="newTitleInput" name="newTitle" /><br />' +
							'Url:<br />' +
							'<input type="text" id="newUrlInput" name="newUrl" />';
						
						$.prompt(txt, { buttons: btOkCancel, callback: create });
					}
				},
				rename: {
					separator_before: false,
					separator_after: false,
					
					icon: false,
					label: "Rename",
					action: function (data) {
						var inst = $.jstree._reference(data.reference);
						var obj = inst.get_node(data.reference);
						var nodeData = obj.data();
						
						var rename = function(v,m,f) {
							if(v !== true)
								return;
							
							if(f.newTitle == null)
								f.newTitle = "";
							
							if (f.newTitle != "") {
								inst.rename_node(obj, f.newTitle);
								nodeData.chromeNode.title = f.newTitle;
								return;
							}
							
							//Allow empty name only for Bookmarks folders.
							if (nodeData.chromeNode.url != "") {
								inst.rename_node(obj, nodeData.chromeNode.url);
								nodeData.chromeNode.title = f.newTitle;
								return;
							}
							
							//Can't rename node.
							//TODO Warn the user.
							return;
						};
						
						var txt = 'Title:<br />' +
							'<input type="text" id="newTitleInput" name="newTitle" value="' + nodeData.chromeNode.title + '" />';
						
						$.prompt(txt, { buttons: btOkCancel, callback: rename });

					}
				},
				remove: {
					separator_before: false,
					separator_after: false,
					
					icon: false,
					label: "Delete",
					action: function (data) {
						var inst = $.jstree._reference(data.reference);
						var obj = inst.get_node(data.reference);
						var nodeData = obj.data();
						
						//If childrens Prompt before deleting.
						if (nodeData.chromeNode.children) {
							var delFol = function(e) {
								if (e === true)
									inst.delete_node(obj);
							};
							$.prompt('Do you want to delete "' + nodeData.chromeNode.title + '" ?',
								{ buttons: btOkCancel, callback: delFol });
						} else inst.delete_node(obj);
					}
				},
				ccp: {
					separator_before: true,
					separator_after: false,
					
					icon: false,
					label: "Edit",
					action: false,
					
					submenu: { 
						cut: {
							separator_before: false,
							separator_after: false,
							
							icon: false,
							label: "Cut",
							action: function (data) { }
						},
						copy: {
							separator_before: false,
							separator_after: false,
							
							icon: false,
							label: "Copy",
							action: function (data) { }
						},
						paste: {
							separator_before: false,
							separator_after: false,
							
							icon: false,
							label: "Paste",
							action: function (data) { }
						}
					}
				},
				openLink: {
					separator_before: false,
					separator_after: false,
					
					icon: false,
					label: "Open Link",
					action: function (data) {
						var inst = $.jstree._reference(data.reference);
						var obj = inst.get_node(data.reference);
						var nodeData = obj.data();
						
						if(nodeData.chromeNode.url)
							location.href = nodeData.chromeNode.url;
						},
						separator_before: true
				},
				openLinkNewTab: {
					separator_before: false,
					separator_after: false,
					
					icon: false,
					label: "Open Link in New Tab",
					action: function (data) {
						var inst = $.jstree._reference(data.reference);
						var obj = inst.get_node(data.reference);
						var nodeData = obj.data();
						
						if(nodeData.chromeNode.url)
							window.open(nodeData.chromeNode.url);
					}
				}
			}
		},
		
		themes: {
			theme: localStorage.jsTree_theme,
			dots: localStorage.jsTree_themeDots
		},
		
		plugins: [
			'core',
			"themes",
			"ui",
			
			"json",
			"state",
			
			"contextmenu",
			
			"hotkeys",
			"dnd"
		]
	};
	
	/*--- Bookmarks toolbar ---*/
	var bookmarksToolbar = $("body div.bookmarks-toolbar");
	var toolSetup = {
		json: {
			data: function(n, apply){
				if(n === -1) {
					chrome.bookmarks.getTree(function(bookmarksTree) {
						var TreeChildArray = [];
						TreeChildArray.push(nodeTojsTree(bookmarksTree[0].children[0]));
						apply.call(this, TreeChildArray);
					});
					return;
				}
			}
		},
		
		//Restore Node Open/Closed
		state: {
			key: "body div.bookmarks-toolbar:Tree"
		}
	};
	bookmarksToolbar.jstree($.extend(true, {}, treeSetup, toolSetup));
	bindTreeEvents(bookmarksToolbar);
	
	/*--- Other bookmarks ---*/
	var otherBookmarks = $("body div.other-bookmarks");
	var otherSetup = {
		//Node Data
		json: {
			data: function(n, apply){
				if(n === -1) {
					chrome.bookmarks.getTree(function(bookmarksTree) {
						var TreeChildArray = [];
						TreeChildArray.push(nodeTojsTree(bookmarksTree[0].children[1]));
						apply.call(this, TreeChildArray);
					});
					return;
				}
			}
		},
		
		//Restore Node Open/Closed
		state: {
			key: "body div.other-bookmarks:Tree"
		}
	};
	otherBookmarks.jstree($.extend(true, {}, treeSetup, otherSetup));
	bindTreeEvents(otherBookmarks);
}

function refreshTree () {
	if(refreshEnabled) {
		$(".jstree").jstree("refresh");
	}
}

function bindTreeEvents (tree) {
	tree.bind("rename_node.jstree", renameNode);
	tree.bind("delete_node.jstree", deleteNode);
	tree.bind("move_node.jstree", moveNode);
	
	tree.find("ul li").live("dblclick", function(e) {
		e.reference = this;
		dbClickNode(e);
	});
	
	//Override check function
	var ins = $.jstree._reference(tree);
	var oldCheck = ins.check;
	ins.check = function (checking, obj, parent, index) {
		if(!oldCheck.call(this, checking, obj, parent, index)) { return false; }
		return checkNode.call(this, checking, obj, parent, index);
	}
}

function nodeTojsTree(node)
{
	var treeNode = {
			title: node.title,
			data: {
				jstree: {
					//icon:false
				},
				chromeNode: node
			},
			li_attr: { id: "li.node.id" + node.id },
			a_attr: {}
		};
	
	//If url is NULL or missing, it is a folder.
	if (node.url) {
		if(treeNode.title == null || treeNode.title == "")
			treeNode.title = node.url;
		
		switch(localStorage.jsTree_FaviconService) {
		case "chrome":
			treeNode.data.jstree.icon = "chrome://favicon/" + node.url;
			break;
		case "google":
			treeNode.data.jstree.icon = "http://www.google.com/s2/favicons?domain=" + node.url;
			break;
		default:
			treeNode.data.jstree.icon = localStorage.jsTree_FaviconService + node.url;
			break;
		}
		
		//Only used to show the link to the user.
		//Not used when opening the link.
		treeNode.a_attr.href = node.url;
		
		return treeNode;
	} else {
		var childs;
		treeNode.data.jstree.children = [];
		
		var addChild = function(childs){
			for (var i in childs) {
				treeNode.data.jstree.children.push(nodeTojsTree(childs[i]));
			}
		};
		
		if (node.children) {
			addChild(node.children);
		} else {
			chrome.bookmarks.getChildren(node.id, addChild);
		}
	}
	
	return treeNode;
}

function normalizeUrl(url)
{
	if (!url.match(/^https?:\/\//)) {
		return 'http://' + url;
	} else {
		return url;
	}
}

function checkNode (checking, obj, parent, index) {
	switch(checking) {
		case "create_node":
			break;
		case "rename_node":
			break;
		case "move_node":
			//Dont allow moving outside the folders
			if(parent === -1) { return false; }
			//Dont allow moving inside a bookmark
			if(parent.data().chromeNode.url) { return false; }
			break;
		case "copy_node":
			break;
		case "delete_node":
			break;
		}
	return true;
}

function moveNode (e, data) {
	var dest = {
		parentId: data.rslt.parent.data().chromeNode.id,
		index: data.rslt.position
	};
	refreshEnabled = false;
	chrome.bookmarks.move(data.rslt.obj.data().chromeNode.id, dest, function(){ refreshEnabled = true; });
}

function renameNode (e, data) {
	var nodeData = data.rslt.obj.data();
	var changes = {
		title: data.rslt.title
	};
	refreshEnabled = false;
	chrome.bookmarks.update(nodeData.chromeNode.id, changes, function(){ refreshEnabled = true; });
}

function deleteNode (e, data) {
	var nodeData = data.rslt.obj.data();
	refreshEnabled = false;
	
	var enableRefresh = function() { refreshEnabled = true; };
	if (nodeData.chromeNode.children)
		chrome.bookmarks.removeTree(nodeData.chromeNode.id, enableRefresh);
	else
		chrome.bookmarks.remove(nodeData.chromeNode.id, enableRefresh);
}

function dbClickNode (e) {
	var inst = $.jstree._reference(e.reference);
	var obj = inst.get_node(e.reference);
	var nodeData = obj.data();
	
	if(nodeData.chromeNode.url) {
		if(e.ctrlKey) {
			window.open(nodeData.chromeNode.url);
		} else {
			location.href = nodeData.chromeNode.url;
		}
	} else {
		//Is a folder, open or close.
		if(inst.is_open(obj))
			inst.close_node(obj);
		else
			inst.open_node(obj);
	}
	e.stopPropagation();
}
