/*
 * jsTree storage plugin
 * Stores the currently opened/selected nodes in a localStorage and then restores them
 */
(function ($) {
	$.jstree.plugin("localStorage", {
		__init : function () {
			if(typeof localStorage === "undefined") { throw "jsTree localStorage: localStorage is not supported by your browser."; }

			var s = this._get_settings().localStorage;
			var tmp;
			
			if(!!s.save_loaded) {
				tmp = localStorage.getItem(s.save_loaded);
				if(tmp && tmp.length) { this.data.core.to_load = tmp.split(","); }
			}
			if(!!s.save_opened) {
				tmp = localStorage.getItem(s.save_opened);
				if(tmp && tmp.length) { this.data.core.to_open = tmp.split(","); }
			}
			if(!!s.save_selected) {
				tmp = localStorage.getItem(s.save_selected);
				if(tmp && tmp.length && this.data.ui) { this.data.ui.to_select = tmp.split(","); }
			}
			this.get_container()
				.one( ( this.data.ui ? "reselect" : "reopen" ) + ".jstree", $.proxy(function () {
					this.get_container()
						.bind("open_node.jstree close_node.jstree select_node.jstree deselect_node.jstree", $.proxy(function (e) { 
								if(this._get_settings().localStorage.auto_save) { this.save_node((e.handleObj.namespace + e.handleObj.type).replace("jstree","")); }
							}, this));
				}, this));
		},
		defaults : {
			save_loaded		: "jstree_load",
			save_opened		: "jstree_open",
			save_selected	: "jstree_select",
			auto_save		: true,
			localStorage_options	: {}
		},
		_fn : {
			save_node : function (c) {
				if(this.data.core.refreshing) { return; }
				var s = this._get_settings().localStorage;
				if(!c) { // if called manually and not by event
					if(s.save_loaded) {
						this.save_loaded();
						localStorage.setItem(s.save_loaded, this.data.core.to_load.join(","));
					}
					if(s.save_opened) {
						this.save_opened();
						localStorage.setItem(s.save_opened, this.data.core.to_open.join(","));
					}
					if(s.save_selected && this.data.ui) {
						this.save_selected();
						localStorage.setItem(s.save_selected, this.data.ui.to_select.join(","));
					}
					return;
				}
				switch(c) {
					case "open_node":
					case "close_node":
						if(!!s.save_opened) {
							this.save_opened(); 
							localStorage.setItem(s.save_opened, this.data.core.to_open.join(","));
						}
						if(!!s.save_loaded) {
							this.save_loaded(); 
							localStorage.setItem(s.save_loaded, this.data.core.to_load.join(",")); 
						}
						break;
					case "select_node":
					case "deselect_node":
						if(!!s.save_selected && this.data.ui) { 
							this.save_selected(); 
							localStorage.setItem(s.save_selected, this.data.ui.to_select.join(",")); 
						}
						break;
				}
			}
		}
	});
	// include localStorage by default
	$.jstree.defaults.plugins.push("localStorage");
})(jQuery);
