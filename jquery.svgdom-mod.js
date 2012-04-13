/* http://keith-wood.name/svg.html
   jQuery DOM compatibility for jQuery SVG v1.4.4.
   Written by Keith Wood (kbwood{at}iinet.com.au) April 2009.
   Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and 
   MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses. 

   Modified/fixed by Joris van de Donk, so that it works properly with StarmapJS
   Please attribute the author if you use it. */

(function($) { // Hide scope, no $ conflict

/* Support adding class names to SVG nodes. */
$.fn.addClass = function(origAddClass) {
	return function(classNames) {
		classNames = classNames || '';
		return this.each(function() {
			if ($.svg.isSVGElem(this)) {
				var node = this;
				$.each(classNames.split(/\s+/), function(i, className) {
					var classes = (node.className ? node.className.baseVal : node.getAttribute('class'));
					if ($.inArray(className, classes.split(/\s+/)) == -1) {
						classes += (classes ? ' ' : '') + className;
						(node.className ? node.className.baseVal = classes :
							node.setAttribute('class',  classes));
					}
				});
			}
			else {
				origAddClass.apply($(this), [classNames]);
			}
		});
	};
}($.fn.addClass);

/* Support removing class names from SVG nodes. */
$.fn.removeClass = function(origRemoveClass) {
	return function(classNames) {
		classNames = classNames || '';
		return this.each(function() {
			if ($.svg.isSVGElem(this)) {
				var node = this;
				$.each(classNames.split(/\s+/), function(i, className) {
					var classes = (node.className ? node.className.baseVal : node.getAttribute('class'));
					classes = $.grep(classes.split(/\s+/), function(n, i) { return n != className; }).
						join(' ');
					(node.className ? node.className.baseVal = classes :
						node.setAttribute('class', classes));
				});
			}
			else {
				origRemoveClass.apply($(this), [classNames]);
			}
		});
	};
}($.fn.removeClass);

/* Support toggling class names on SVG nodes. */
$.fn.toggleClass = function(origToggleClass) {
	return function(className, state) {
		return this.each(function() {
			if ($.svg.isSVGElem(this)) {
				if (typeof state !== 'boolean') {
					state = !$(this).hasClass(className);
				}
				$(this)[(state ? 'add' : 'remove') + 'Class'](className);
			}
			else {
				origToggleClass.apply($(this), [className, state]);
			}
		});
	};
}($.fn.toggleClass);
})(jQuery);
