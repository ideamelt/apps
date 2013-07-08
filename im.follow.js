/*

	!!! jQuery required !!!

	This app takes all elements with specific classes and turns them into clickable buttons that will follow or unfollow the specified user. This app relies on custom data-attributes on elements.

	The following data attributes can be used:

	data-ideamelt="follow"
	- required!
	- any element with this data-attribute will be turned into a button
	
	data-user-url="..."
	- not required
	- if this has not been provided, library will use Echo.UserSession.get('identityUrl') to get the URL of the logged in user

	data-user-to-follow="..."
	- required

	data-title="..."
	- not required
	- if included, text will say "Follow TITLE"

	You can use this on any HTML element.

	<div class="..." data-ideamelt="follow" data-user-to-follow="http://ideamelt.com/user/guest"></div>

	To initialize, use the following function:
	IdeaMelt.Apps.Follow.init(API_KEY);

	You do not need to wrap this in a document.ready() function, do it as soon as possible!

	The script uses 3 class:
	'im-unfollow'
	'im-follow'
	'im-disabled'

*/

(function($, window) {

	var Follow = {};

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



	Follow.Class = {
		'unfollow': 'im-unfollow',
		'follow': 'im-follow',
		'disabled': 'im-disabled',
	};



	Follow.init = function(api_key) {
		//check for API key
		if(api_key == undefined || api_key.length < 1) console.log('Error - please provide an api-key');

		//init request defaults
		Follow.ajaxData = {
			crossDomain: true,
			api_key: api_key
		}

		// init elements
		Follow.onEchoInit(
			//onEcho
			function() {
				Follow.items = [];
				$('[data-ideamelt="follow"]').each(function(index, item) {
					Follow.items.push(new Follow.Element(item));
				});

			}
		);

		// Base CSS
		Follow.css('[data-ideamelt="follow"] {cursor:pointer;} .' + Follow.Class.disabled + ' {pointer-events:none !important;}');

		//attach live update event
		$('body').on('im-toggle-follow', function(e) {
			$.each(Follow.items, function(index, item) {
				if(item.userToFollow == e.userToFollow) {
					if(item.state && !e.state) item.setToFollow();
					else if(!item.state && e.state) item.setToUnFollow();
				}
			});
		});
	}

	Follow.onEchoInit = function(onEcho, onNoEcho) {
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


	Follow.request = function(type, url, data, success, fail) {
		$.ajax({
			type: type,
			url: url,
			dataType: 'json',
			data: $.extend({}, Follow.ajaxData, data),
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

	Follow.refresh = function() {
		$.each(Follow.items, function(index, item) {
			item.checkRelationship();
		});
	}

	Follow.Element = function(item) {
		var self = this;
		this.$item = $(item);
		
		this.userToFollow = this.$item.data('user-to-follow') == undefined ? console.log('user-to-follow data-attribute missing') : this.$item.data('user-to-follow');
		this.userUrl = this.$item.data('user-url') != undefined ? this.$item.data('user-url') : window.Echo.UserSession.get('identityUrl');
		this.title = this.$item.data('title') == undefined ? '' : ' ' + this.$item.data('title');

		if(window.Echo.UserSession.is('logged')) {
			this.checkRelationship();
			this.$item.off('click.im-follow');
			this.$item.on('click.im-follow', function() {self.toggleRelationship();});
		}
		else {
			this.$item.text('Follow');
		}
	}

	Follow.Element.prototype.setToFollow = function() {
		this.state = false;
		this.$item.
			addClass(Follow.Class.follow).
			removeClass(Follow.Class.unfollow).
			removeClass(Follow.Class.disabled).
			text('Follow' + this.title);
	}

	Follow.Element.prototype.setToUnFollow = function() {
		this.state = true;
		this.$item.
			addClass(Follow.Class.unfollow).
			removeClass(Follow.Class.follow).
			removeClass(Follow.Class.disabled).
			text('Unfollow' + this.title);
	}

	Follow.Element.prototype.checkRelationship = function() {
		var self = this;
		this.$item.addClass(Follow.Class.disabled);
		new Follow.request(
				// method
				'GET',
				// api url
				'https://api.ideamelt.com/v1/user/is_following_user',
				// data
				{
					user_url: this.userUrl,
					following_user_url: this.userToFollow
				},
				// success function
				function(response) {
					if(response.is_followed) self.setToUnFollow();
					else if(!response.is_followed) self.setToFollow();
					else console.log(response);
					self.$item.removeClass(Follow.Class.disabled);
				},
				// fail function
				function(response) {
					self.$item.removeClass(Follow.Class.disabled);
					console.log(response);
				}
			);
	}

	Follow.Element.prototype.toggleRelationship = function() {
		var self = this;
		this.$item.addClass(Follow.Class.disabled);
		new Follow.request(
				// method
				'POST',
				// api url
				'https://api.ideamelt.com/v1/user/follow',
				// data
				{
					user_url: this.userUrl,
					user_to_follow: this.userToFollow
				},
				// success function
				function(response) {
					if(response.result) self.setToUnFollow();
					else if(!response.result) self.setToUnFollow();
					else console.log(response);
					self.$item.removeClass(Follow.Class.disabled);
					$('body').trigger({
						type: 'im-toggle-follow',
						state: response.result,
						userToFollow: self.userToFollow
					});
				},
				// fail function
				function(response) {
					self.$item.removeClass(Follow.Class.disabled);
					console.log(response);
				}
			);
	}



	Follow.css = function(css) {
		var style = $('<style type="text/css">' + css + '</style>');
		$(document.getElementsByTagName("head")[0] || document.documentElement).prepend(style);
	};



	window.IdeaMelt = window.IdeaMelt || {};
	window.IdeaMelt.Apps = window.IdeaMelt.Apps || {};
	window.IdeaMelt.Apps.Follow = Follow;

})($, window);