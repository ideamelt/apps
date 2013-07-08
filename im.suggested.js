(function($, window) {

	var Suggested = {};

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

	

	Suggested.config = {
		api_key: undefined,
		quantity: 3,
		target: undefined,
		style: false,
	}

	Suggested.Suggestions = [];

	Suggested.Fallback = [];

	Suggested.Class = {
		item: 'im-suggested-item',
		itemAvatar: 'im-suggested-itemAvatar',
		itemTitle: 'im-suggested-itemTitle',
		itemLink: 'im-suggested-itemLink',
		itemFollow: 'im-suggested-itemFollow',
		itemDisabled: 'im-suggested-itemDisabled',
	}

	Suggested.userTemplate =
		'<div class="{{item}}">' +
			'<a class="{{itemLink}}" href="{{this.url}}">' +
				'<img class="{{itemAvatar}}" src="{{this.avatar}}"></img>' +
				'<div class="{{itemTitle}}">{{this.title}}</div>' +
			'</a>' +
			'<a class="{{itemFollow}}" href="JavaScript:void(0);">' +
				'Follow' +
			'</a>' +
		'</div>';

	Suggested.init = function(config) {
		//check for API key
		if(config.api_key == undefined || typeof config.api_key != "string") console.log('Error - please provide a valid api-key');
		
		//checks for valid target. if true, turns it into jquery target
		else if(config.target == undefined || $(config.target).length != 1) console.log('Error - please provide a single, valid target');
		
		else {
			config.target = $(config.target).eq(0);

			$.extend(true, Suggested.config, config);

			//init request defaults
			Suggested.ajaxData = {
				crossDomain: true,
				api_key: Suggested.config.api_key
			}

			if(Suggested.config.style) Suggested.injectStyle();

			Suggested.onEchoInit(
				//onEcho
				function() {
					Suggested.getSuggestions();
				},
				//onNoEcho
				function() {
					// Suggested.renderSuggestions(Suggested.Fallback);
				}
			);

			return;
		}

		return false;
	}

	Suggested.onEchoInit = function(onEcho, onNoEcho) {
		var count = 0;
		var interval = window.setInterval(function() {
			// waited long enough
			if(count == 20) {
				// clear interval
				window.clearInterval(interval);
				// user session doesnt exist. fallback in application if fallback function exists
				if(onNoEcho != undefined) onNoEcho();
			}
			// waiting for echo.usersession
			else if(window.Echo != undefined && window.Echo.UserSession != undefined && window.Echo.UserSession.identity != undefined) {
				// clear interval
				window.clearInterval(interval);
				// user session exists. lets get this party started
				if(onEcho != undefined) onEcho();
			}
			// no changes, continuing wait
			else {
				count ++;
			}
		}, 100);
	}

	Suggested.css = function(css) {
		var style = $('<style type="text/css">' + css + '</style>');
		$(document.getElementsByTagName("head")[0] || document.documentElement).prepend(style);
	};

	Suggested.request = function(type, url, data, success, fail) {
		$.ajax({
			type: type,
			url: url,
			dataType: 'json',
			data: $.extend({}, Suggested.ajaxData, data),
			success: function(response) {
				if(response.success) {
					success(response);
				}
				else {
					fail(response);
				}
			},
			error: function(response) {
				fail(response);
			}
		});
	}

	Suggested.getSuggestions = function(success, fail) {
		new Suggested.request(
			//method
			'GET',
			//url
			'https://api.ideamelt.com/v1/user/follow_suggestions',
			//data
			{
				top: Suggested.config.quantity,
				user_url: Echo.UserSession.get('identityUrl')
			},
			//success
			function(response) {
				Suggested.renderSuggestions(response.suggestions);
			},
			//fail
			function(response) {
				console.log(response);
				Suggested.renderSuggestions(Suggested.Fallback);
			}
		)
	}

	Suggested.renderSuggestions = function(data) {
		Suggested.Suggestions = [];
		Suggested.config.target.find('.' + Suggested.Class.item).remove();
		$.each(data, function(index, item) {
			Suggested.Suggestions.push(new Suggested.Item(item));
			if((index + 1) == Suggested.config.quantity) return false;
		});
	}

	Suggested.Item = function(item) {
		for(var key in item) {
  			this[key] = item[key];
		}
		this.render();
	};

	Suggested.Item.prototype.compile = function() {
		var tmp = Suggested.userTemplate;
		tmp = tmp.replace('{{this.url}}', this.url);
		tmp = tmp.replace('{{this.avatar}}', this.avatar);
		tmp = tmp.replace('{{this.title}}', this.title);
		tmp = tmp.replace('{{this.following_count}}', this.following_count);
		for(var key in Suggested.Class) {
  			tmp = tmp.replace('{{' + key + '}}', Suggested.Class[key]);
		}
		this.$el = $(tmp);
		return this.$el;
	}

	Suggested.Item.prototype.render = function() {
		var self = this;
		Suggested.config.target.append(this.compile());
		if(Echo.UserSession.is('logged')) {
			this.$el.find('.' + Suggested.Class.itemFollow).on('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				$(this).off('click');
				self.follow();
			});
		}
	}

	Suggested.Item.prototype.follow = function() {
		var self = this;
		this.$el.find('.' + Suggested.Class.itemFollow).addClass(Suggested.Class.itemDisabled);
		new Suggested.request(
			//method
			'POST',
			//url
			'https://api.ideamelt.com/v1/user/follow',
			{
				user_to_follow: self.url,
				user_url: Echo.UserSession.get('identityUrl')
			},
			function(response) {
				Suggested.getSuggestions();
			},
			function(response) {
				console.log(response);
				self.$el.find('.' + Suggested.Class.itemFollow).removeClass(Suggested.Class.itemDisabled);
			}
		)
	}

	Suggested.injectStyle = function() {
		Suggested.css(
			'.' + Suggested.Class.item + '{width: 100%; margin-bottom: 20px; height: 48px; overflow: hidden; position: relative;}' +
			'.' + Suggested.Class.itemAvatar + '{height: 48px; position: absolute; top: 0px; left: 0px; max-width: 48px;}' +
			'.' + Suggested.Class.itemTitle + '{margin-left: 54px; font-size: 14px; line-height: 1; padding: 16px 0px 18px; text-decoration: none;}' +
			'.' + Suggested.Class.itemLink + '{display: inline-block;position: relative;height: 48px;overflow: hidden;text-decoration: none;}' +
			'.' + Suggested.Class.itemFollow + '{position: absolute; right: 0px; font-size: 14px; -webkit-border-radius: 4px; -moz-border-radius: 4px; -o-border-radius: 4px; border-radius: 4px; background: #3399cc; background: -moz-linear-gradient(top, #3399cc 0%, #336699 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#3399cc), color-stop(100%,#336699)); background: -webkit-linear-gradient(top, #3399cc 0%,#336699 100%); background: -o-linear-gradient(top, #3399cc 0%,#336699 100%); background: -ms-linear-gradient(top, #3399cc 0%,#336699 100%); background: linear-gradient(to bottom, #3399cc 0%,#336699 100%); filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#3399cc", endColorstr="#336699",GradientType=0 ); color: #FFF; padding: 8px 12px 8px; top: 8px; text-decoration: none; -webkit-box-shadow: 0px 0px 12px 12px white; -moz-box-shadow: 0px 0px 12px 12px white; -o-box-shadow: 0px 0px 12px 12px white; box-shadow: 0px 0px 12px 12px white;}' +
			'.' + Suggested.Class.itemFollow + ':hover{background: #0073ae; text-decoration: none;}' +
			'.' + Suggested.Class.itemDisabled + '{pointer-events: none; background: #BBB;}'
		);
	}

	window.IdeaMelt = window.IdeaMelt || {};
	window.IdeaMelt.Apps = window.IdeaMelt.Apps || {};
	window.IdeaMelt.Apps.Suggested = Suggested;

})($, window);