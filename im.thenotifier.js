(function(jQuery) {
"use strict";

var $ = jQuery;

var IMNotify = Echo.App.manifest("IdeaMelt.Apps.TheNotifier");

if (Echo.App.isDefined("IdeaMelt.Apps.TheNotifier")) return;

IMNotify.init = function() {
	if (!this.config.get('imAppkey') || !this.config.get('baseDomain')) return;
	if (this.config.get('debug')) this.log({message: 'app initialized'});
	this.userHandler();
	this.render();
	this.ready();
	this.domEvents();
};



IMNotify.dependencies = [{
	"loaded": function() {
		return Echo.Control.isDefined("Echo.StreamServer.Controls.Stream");
	},
	"url": "{sdk}/streamserver.pack.js"
}];

IMNotify.config = {
	debug: false,
	imAppkey: undefined,
	baseDomain: undefined,
	liveUpdatesInterval: 5,
	fadeToggleTimeout: 200
};

IMNotify.vars = {
	last_read_count_local: undefined,
	last_read_count_server: undefined,
	stream_count: undefined
}

IMNotify.templates.LoggedIn =
	'<div class="{class:wrapper}">' +
		'<div class="{class:container}">' +
			'<a href="#" class="{class:notifyButton}">' +
				'<span class="{class:count}"></span>' +
			'</a>' +
			'<div class="{class:notifyStreamFrame}">' +
				'<div class="{class:notifyStreamFrameInner}"></div>' + 
					'<div class="{class:notifyTitle}">Notifications</div>' +
	            	'<div class="{class:notifyBody}">' +
						' <div class="{class:stream}"></div>' +
					'</div>' +
				'</div>' + 
			'</div>' +
		'</div>' + 
	'</div>';

IMNotify.templates.LoggedOut = '';



IMNotify.methods.userHandler = function() {
	if (this.user.is('logged')) {
		if (this.config.get('debug')) this.log({message: 'logged'});

		this.set('last_read_count_local', 0);
		this.set('last_read_count_server', 0);
		this.set('stream_count', 0);

		this.checkUser();
		this.checkLastReadCount();
		this.checkStreamCount();

		var user_url = this.user.get('identityUrl');
		var base_domain = this.config.get('baseDomain');
		if (base_domain.substring(base_domain.length-1,base_domain.length) === '/') {
			base_domain = base_domain.substring(0,base_domain.length-1);
		};

		var stream_url = base_domain + '/im-notifications/' + user_url;
		this.config.set('stream_url', stream_url);


	} else {
		if (this.config.get('debug')) this.log({message: 'not-logged'});
	};
};

IMNotify.methods.sendRequest = function(endpoint, method, data, callback) {
	if (this.config.get('debug')) this.log({message: 'sendRequest - executing'});
	var self = this;
	var base = {
		crossDomain: true,
		api_key: this.config.get('imAppkey')
	}
	var payload = $.extend(base, data);
	$.support.cors = true;
	var url = 'http://api.ideamelt.com/v1' + endpoint;
	$.ajax({
		type: method,
		url: url,
		dataType: 'json',
		data: payload,
		success: function(r) {
			if (r.success) callback(r);
			if (self.config.get('debug')) self.log({message: r});
		},
		error: function() {
			if (self.config.get('debug')) self.log({message: "sendRequest - error"});
		}
	});
}

IMNotify.methods.checkUser = function() {
	if (this.config.get('debug')) this.log({message: 'checkUser - executing'});
	var self = this;
	var endpoint = '/user/create/';
	var data = {
		user_url: this.user.get('identityUrl'),
		title: this.user.get('name'),
		avatar: this.user.get('avatar')
	};
	var callback = function(r) {
		if (self.config.get('debug')) self.log({message: 'checkUser - successful'});
	}
	this.sendRequest(endpoint, 'POST', data, callback);	
};		

IMNotify.methods.checkLastReadCount = function() {
	if (this.config.get('debug')) this.log({message: 'checkLastReadCount - executing'});
	var self = this;
	var endpoint = '/notifications/count/';
	var data = {
		user_url: this.user.get('identityUrl')
	};
	var callback = function(r) {
		if (self.config.get('debug')) self.log({message: 'checkLastReadCount - successful'});
		self.set('last_read_count_local', r["count"]);
		self.set('last_read_count_server', r["count"]);
	}
	this.sendRequest(endpoint, 'GET', data, callback);
};

IMNotify.methods.checkStreamCount = function() {
	if (this.config.get('debug')) this.log({message: 'checkStreamCount - executing'});
	var stream_url = this.config.get('baseDomain') + '/im-notifications/' + this.user.get('identityUrl');
	var request = this.get("request");
    if (!request) {
        request = Echo.StreamServer.API.request({
            "endpoint": "count",
            "data": {
                "q": 'childrenof:' + stream_url,
                "appkey": this.config.get("appkey")
            },
            "liveUpdatesTimeout": this.config.get("liveUpdatesInterval"),
            "recurring": true,
            "onError": $.proxy(this._error, this),
            "onData": $.proxy(this.updateStreamCount, this)
        });
        this.set("request", request);
    }
    request.send();
    if (this.config.get('debug')) this.log({message: 'checkStreamCount - successful'});
};

IMNotify.methods.updateStreamCount = function(data) {
	this.set('stream_count', data.count);
	if (this.config.get('debug')) this.log({message: 'updateStreamCount - successful'});
	this.view.render({name: 'count'});
};

IMNotify.methods.updateLastReadCount = function() {
	this.set('last_read_count_local', this.get('stream_count'));
	if (this.config.get('debug')) this.log({message: 'updateLastReadCount - successful'});
	this.updateLastReadOnServer();
	this.view.render({name: 'count'});
};

IMNotify.methods.updateLastReadOnServer = function() {
	if (this.config.get('debug')) this.log({message: 'updateLastReadOnServer - executing'});
	var self = this;
	var endpoint = '/notifications/count/';
	var data = {
		user_url: this.user.get('identityUrl'),
		count: this.get('last_read_count_local')
	}
	var callback = function(r) {
		if (self.config.get('debug')) self.log({message: 'updateLastReadOnServer - successful'});
	}
	if (this.get('last_read_count_server') != this.get('last_read_count_local')) {
		this.sendRequest(endpoint, 'POST', data, callback);
	};
	return;
};



IMNotify.methods.template = function() {
	return this.templates["Logged" + (this.user.is("logged") ? "In" : "Out")];
};

IMNotify.methods.domEvents = function() {
	var self = this;
	$('html').bind('click', function() {
		self.view.get('notifyStreamFrame').hide();
		self.view.get('notifyButton').removeClass(self.cssPrefix + 'notifyButtonSelected');
	});
};

IMNotify.renderers.stream = function(element) {
	if (this.config.get('debug')) this.log({message: 'stream renderer - executing'});
	var user_url = this.user.get('identityUrl');
	var base_domain = this.config.get('baseDomain');
	var stream_url = base_domain + '/im-notifications/' + user_url;
	var timeout = this.config.get('liveUpdatesInterval');
	this.initComponent({
		"id": "Stream",
		"component": "Echo.StreamServer.Controls.Stream",
		"config": {
			"target": element,
			"query": 'childrenof:'+ stream_url +' itemsPerPage:15 safeHTML:off children:0',
			"state": {
				"label": {
					"icon": false,
					"text": false
					}
				},
			"item": {
				"reTag": false,
				"contentTransformations": {
					"text": ["hashtags", "urls", "newlines"],
					"html": ["hashtags", "urls", "newlines"],
					"xhtml": ["hashtags", "urls"]
				}
			},
			"liveUpdates":{"enabled": true, "timeout": timeout}
		}
	});
	return element;
};

IMNotify.renderers.notifyStreamFrame = function(element) {
	if (this.config.get('debug')) this.log({message: 'notifyStreamFrame renderer - executing'});
	var self = this;
	element.off('click');
	element.on('click', function(e) {
		e.stopPropagation();
	});
	return element;
}

IMNotify.renderers.notifyButton = function(element) {
	if (this.config.get('debug')) this.log({message: 'notifyButton renderer - executing'});
	var self = this;
	element.off('click');
	element.on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
    	$(this).toggleClass(self.cssPrefix + 'notifyButtonSelected');
		self.view.get('notifyStreamFrame').fadeToggle(self.config.get('fadeToggleTimeout'));
		self.updateLastReadCount();
	});
	return element;
}

IMNotify.renderers.count = function(element) {
	if (this.config.get('debug')) this.log({message: 'count renderer - executing'});
	if (this.get('last_read_count_local') === undefined || this.get('last_read_count_server') === undefined) return;
	var currentCount = this.get('stream_count') - this.get('last_read_count_local');
	if (currentCount > 0) this.view.get('notifyButton').addClass(this.cssPrefix + 'notifyButtonLit');
	else {
		currentCount = 0;
		this.view.get('notifyButton').removeClass(this.cssPrefix + 'notifyButtonLit');
	}
	element.text(currentCount);
	if (this.config.get('debug')) this.log({message: 'count renderer - successful'});
	return element;
};



IMNotify.css = '.{class:wrapper} * { -webkit-box-sizing:border-box; -moz-box-sizing:border-box; box-sizing:border-box; }' + 
'.{class:container} { position:relative; margin:0 auto; width:28px; height:28px;}' +
'.{class:notifyButton} { font-weight: bold; font-family: Arial,sans-serif; -webkit-border-radius: 1px; -moz-border-radius: 1px; border-radius: 1px; text-align: center; font-size: 15px; color: #aaa; background: #F8F8F8; background: -webkit-gradient(linear,left top,left bottom,from(#F8F8F8),to(#ECECEC)); background: -webkit-linear-gradient(top,#F8F8F8,#ECECEC); background: -moz-linear-gradient(top,#F8F8F8,#ECECEC); background: -ms-linear-gradient(top,#F8F8F8,#ECECEC); background: -o-linear-gradient(top,#F8F8F8,#ECECEC); background: linear-gradient(top,#F8F8F8,#ECECEC); border: 1px solid #c6c6c6; display: block; width: 28px; height: 28px; cursor:pointer; line-height:28px; margin:0 auto; -webkit-border-radius:1px; -moz-border-radius:1px; border-radius:1px; transition: box-shadow 0.1s ease-in-out; -webkit-transition: box-shadow 0.1s ease-in-out; -moz-transition: box-shadow 0.1s ease-in-out; -o-transition: box-shadow 0.1s ease-in-out; }' +
'.{class:notifyButton}:active, .{class:notifyButtonSelected} { box-shadow:inset 0 2px 3px rgba(0,0,0,0.1); }' +
'.{class:count} { cursor: inherit; }' +
'.{class:notifyStreamFrame} { display:none; position:absolute; width:300px; top: 43px; right: -136px; background:#fff; height:350px; border:1px solid #aaaaaa; -webkit-box-shadow:0 3px 8px rgba(0, 0, 0, .25);  -moz-box-shadow:0 3px 8px rgba(0, 0, 0, .25); box-shadow:0 3px 8px rgba(0, 0, 0, .25); z-index:101;}' +
'.{class:notifyTitle} { padding:10px; border-bottom:1px solid #ccc; font-size:13px; -webkit-box-shadow:0 1px 1px rgba(0, 0, 0, 0.1); -moz-box-shadow:0 1px 1px rgba(0, 0, 0, 0.1); box-shadow:0 1px 1px rgba(0, 0, 0, 0.1);}' +
'.{class:notifyBody} { padding: 10px;overflow-y: scroll;position: absolute;bottom: 0px;top: 41px;padding-top: 0; width:100%;}' +
'.{class:notifyStreamFrameInner} { position:relative;}' +
'.{class:notifyStreamFrameInner}:after, .{class:notifyStreamFrameInner}:before {bottom: 100%;border: solid transparent;content: " ";height: 0;width: 0;position: absolute; pointer-events: none;}' +
'.{class:notifyStreamFrameInner}:after {border-color: rgba(255, 255, 255, 0);border-bottom-color: #ffffff;border-width: 8px;left: 50%;margin-left: -8px;}' + 
'.{class:notifyStreamFrameInner}:before {border-color: rgba(170, 170, 170, 0);border-bottom-color: #aaaaaa;border-width: 9px;left: 50%;margin-left: -9px;}' + 
'.{class:wrapper} .echo-streamserver-controls-stream-item-authorName {display:none}' + 
'.{class:notifyButtonLit} {background: #D14836; background: -webkit-gradient(linear,left top,left bottom,from(#DD4B39),to(#D14836)); background: -webkit-linear-gradient(top,#DD4B39,#D14836); background: -moz-linear-gradient(top,#DD4B39,#D14836); background: -ms-linear-gradient(top,#DD4B39,#D14836); background: -o-linear-gradient(top,#DD4B39,#D14836); background: linear-gradient(top,#DD4B39,#D14836); progid:DXImageTransform.Microsoft.gradient(startColorStr="#dd4b39",EndColorStr="#d14836"); border: 1px solid #C13828;color:#fff}' +
'.{class:body-item-username} {font-weight:bold}';

Echo.App.create(IMNotify);

})(Echo.jQuery);