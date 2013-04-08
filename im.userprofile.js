(function($, window) {

	(function() {
		var method;
		var noop = function noop() {};
		var methods = [
		    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
		    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
		    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
		    'timeStamp', 'trace', 'warn'
		];
		var length = methods.length;
		var console = (window.console = window.console || {});

		while (length--) {
		    method = methods[length];

		    // Only stub undefined methods.
		    if (!console[method]) {
		        console[method] = noop;
		    }
		}
	}());

	var UserProfile = {};

	UserProfile.config = {
		targets: {
			stream: false,
			title: false,
			avatar: false,
		},
		appkey: false,
		imAppkey: false,
		baseDomain: false,
		namespace: false,
		userUrl: false,
		liveUpdates: true,
		liveUpdatesInterval: 10,
		debug: false
	};

	UserProfile.init = function(config) {
		if(!config) return this.log('error', 'config not provided');
		if(!config.targets) return this.log('error', 'targets not provided');
		if(!config.appkey) return this.log('error', 'appkey not provided');
		if(!config.imAppkey) return this.log('error', 'imAppkey not provided');
		if(!config.baseDomain) return this.log('error', 'baseDomain not provided');
		if(!config.namespace) return this.log('error', 'namespace not provided');
		
		this.config = config;

		IdeaMelt.init({api_key:this.config.imAppkey});
		if(this.config.userUrl) this.getUser();
	}

	UserProfile.log = function(type, message) {
		if(type == "error") {
			console.error(message);
			return false;	
		}
		else if(this.config.debug) console.log(message);
	}

	UserProfile.css = function(cssCode) {
		var curCssCode = "";
		var oldStyle = null;
		if (curCssCode.length + cssCode.length > 100000) {
			oldStyle = null;
			curCssCode = "";
		}
		var newStyle = $('<style id="im-up-css" type="text/css">' + curCssCode + cssCode + '</style>');
		if (oldStyle && oldStyle.length) {
			oldStyle.replaceWith(newStyle);
		} else {
			$(document.getElementsByTagName("head")[0] || document.documentElement).prepend(newStyle);
		}
	};	

	UserProfile.getUser = function() {
		var self = this;
		var options = {
			user_url: this.config.userUrl,
		};
		var success = function(response) {
			self.user = response.user;
			self.initComponents();
		};
		var fail = function(response) {
			$.each(reponse.message_list, function(index, item) {
				return self.log('error', item);
			});
		};
		IdeaMelt.send('UserExists', options, success, fail);
	}

	UserProfile.initComponents = function() {
		if(this.config.targets.stream) this.userStreamConstructor();
		if(this.config.targets.avatar) this.userAvatar();
		if(this.config.targets.title) this.userTitle();
	}

	UserProfile.userStreamConstructor = function() {
		var self = this;
		Echo.Loader.initApplication({
			'script': 'http://ideamelt.com/static/apps/3.0/im.socialstream.js',
			'component': 'IdeaMelt.Apps.SocialStream',
			'config': {
				"target": this.config.targets.stream,
				"appkey": this.config.appkey,
				"imAppkey": this.config.imAppkey,
				"namespace": this.config.namespace,
				"baseDomain": this.config.baseDomain,
				"personalize": false,
				"userUrls": [this.config.userUrl],
				"aggregator": false,
				"compact" : false,
				'ready': function() {
					self.userStream = this;
				}
			}
		});
	}

	UserProfile.userAvatar = function() {
		var avatar = $('<img>').attr('src', this.user.avatar);
		var h = avatar[0].naturalHeight;
		var w = avatar[0].naturalWidth;
		if (h >= w) avatar.addClass('im-up-avatar-h');
		else avatar.addClass('im-up-avatar-w');
		avatar.appendTo(this.config.targets.avatar);
	}

	UserProfile.userTitle = function() {
		$('<div>')
			.addClass('im-up-title')
			.text(this.user.title)
			.appendTo(this.config.targets.title);
	}

	// UserProfile.UserFollow = function(target) {
	// 	this.target = target;
	// 	this.el = $('<a>').addClass('ideamelt-userprofile-userfollow').data('urlToFollow', this.user.url);
	// 	this.getRelationship();
	// 	var self = this;
	// 	this.target.on('click', 'ideamelt-userprofile-userfollow', function(e) {
	// 		e.preventDefault();
	// 		e.stopPropagation();
	// 		self.followToggle();
	// 		$('.ideamelt-userprofile-userfollow').trigger('follow_triggered');
	// 	})
	// 	this.el.on('follow_triggered', function() {self.addClass('ideamelt-userprofile-disabled');});
	// 	this.el.on('follow_complete_true', function() {self.updateText(true);});
	// 	this.el.on('follow_complete_false', function() {self.updateText(false);});
	// }

	// UserProfile.UserFollow.prototype.getRelationship = function() {
	// 	var self = this;
	// 	var options = {
	// 		followee_url: UserProfile.user.url,
	// 		user_url: UserProfile.config.loggedInUserUrl
	// 	}
	// 	var success = function(response) {
	// 		self.updateText(reponse.is_followed);
	// 	}
	// 	IdeaMelt.send('IsFollowingUser', options, success);
	// }

	// UserProfile.UserFollow.prototype.updateText = function(bool) {
	// 	if(bool) this.el.text('Unfollow');
	// 	else this.el.text('Follow');
	// 	this.el.removeClass('ideamelt-userprofile-disabled');
	// 	this.target.find('.ideamelt-userprofile-userfollow').remove();
	// 	this.target.append(this.el);
	// }

	// UserProfile.UserFollow.prototype.followToggle = function() {
	// 	var self = this;
	// 	var options = {
	// 		followee_url: UserProfile.user.url,
	// 		follower_url: UserProfile.config.loggedInUserUrl
	// 	}
	// 	var success = function(response) {
	// 		$('.ideamelt-userprofile-userfollow').trigger('follow_complete_' + response.result);
	// 	}
	// 	IdeaMelt.send('UserFollow', options, success);
	// }

	// UserProfile.Friends = function(name, target, endpoint) {
	// 	this.instance = name;
	// 	this.targetElem = target;
	// 	this.endpoint = endpoint;
	// 	this.getData();
	// 	var self = this;
	// 	if(this.interval == undefined && UserProfile.config.liveUpdates) this.interval = window.setInterval(function() {self.getData()}, UserProfile.config.liveUpdatesInterval*1000);
	// }

	// UserProfile.Friends.prototype.getData = function() {
	// 	var self = this;
	// 	var options = {
	// 		user_url: UserProfile.user.url
	// 	}
	// 	var success = function(response) {
	// 		var list = self.instance + '_list';
	// 		self.assembleHtml(response[list]);
	// 	}
	// 	IdeaMelt.send(self.endpoint, options, success);
	// }

	// UserProfile.Friends.prototype.assembleHtml = function(data) {
	// 	var length = data.length;
	// 	var container = $('<div>').addClass('ideamelt-userprofile-friendcontainer').addClass('ideamelt-userprofile-' + this.instance);
	// 	$.each(data, function(index, item) {
	// 		if(UserProfile.config.debug) console.log(item);
	// 		var el = $('<a>').data(item).attr('class', 'ideamelt-userprofile-frienditem').attr('href', item.url);
	// 		var img = $('<img>').attr('class', 'ideamelt-userprofile-friendavatar').attr('src', item.avatar);
	// 		var title = $('<div>').attr('class', 'ideamelt-userprofile-friendtitle').attr('src', item.avatar);
	// 		img.appendTo(el);
	// 		title.appendTo(el);
	// 		el.appendTo(container);
	// 	})
	// 	this.targetElem.find('.ideamelt-userprofile-friendcontainer').remove();
	// 	this.targetElem.append(container);
	// }

	UserProfile.css('.im-up-avatar-w {max-height: 100%; min-height: 100%; vertical-align: middle; border: 0; -ms-interpolation-mode: bicubic;}');
	UserProfile.css('.im-up-avatar-h {max-width: 100%; min-width: 100%; vertical-align: middle; border: 0; -ms-interpolation-mode: bicubic;}');

	var IdeaMelt = window.IdeaMelt || {};
	IdeaMelt.Apps = window.IdeaMelt.Apps || {};
	IdeaMelt.Apps.UserProfile = function(config) {return this.init(config);}
	IdeaMelt.Apps.UserProfile.prototype = UserProfile;

})($, window);