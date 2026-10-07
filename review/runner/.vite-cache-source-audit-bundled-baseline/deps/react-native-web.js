import { a as __toESM, i as __toCommonJS, n as __esmMin, r as __exportAll, t as __commonJSMin } from "./rolldown-runtime-7_rZTKki.js";
import { t as require_react } from "./react.js";
import { n as require_react_dom, t as require_client } from "./client-C5PRJuo1.js";
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/AccessibilityUtil/isDisabled.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var isDisabled = (props) => props.disabled || Array.isArray(props.accessibilityStates) && props.accessibilityStates.indexOf("disabled") > -1;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/AccessibilityUtil/propsToAriaRole.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var accessibilityRoleToWebRole = {
	adjustable: "slider",
	button: "button",
	header: "heading",
	image: "img",
	imagebutton: null,
	keyboardkey: null,
	label: null,
	link: "link",
	none: "presentation",
	search: "search",
	summary: "region",
	text: null
};
var propsToAriaRole = (_ref) => {
	var accessibilityRole = _ref.accessibilityRole;
	var _role = _ref.role || accessibilityRole;
	if (_role) {
		var inferredRole = accessibilityRoleToWebRole[_role];
		if (inferredRole !== null) return inferredRole || _role;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/AccessibilityUtil/propsToAccessibilityComponent.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var roleComponents = {
	article: "article",
	banner: "header",
	blockquote: "blockquote",
	button: "button",
	code: "code",
	complementary: "aside",
	contentinfo: "footer",
	deletion: "del",
	emphasis: "em",
	figure: "figure",
	insertion: "ins",
	form: "form",
	list: "ul",
	listitem: "li",
	main: "main",
	navigation: "nav",
	paragraph: "p",
	region: "section",
	strong: "strong"
};
var emptyObject$12 = {};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/AccessibilityUtil/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var AccessibilityUtil = {
	isDisabled,
	propsToAccessibilityComponent: function propsToAccessibilityComponent(props) {
		if (props === void 0) props = emptyObject$12;
		if ((props.role || props.accessibilityRole) === "label") return "label";
		var role = propsToAriaRole(props);
		if (role) {
			if (role === "heading") {
				var level = props.accessibilityLevel || props["aria-level"];
				if (level != null) return "h" + level;
				return "h1";
			}
			return roleComponents[role];
		}
	},
	propsToAriaRole
};
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof$1(o) {
	"@babel/helpers - typeof";
	return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof$1(o);
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
	if ("object" != _typeof$1(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof$1(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof$1(i) ? i : i + "";
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/objectSpread2.js
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose(r, e) {
	if (null == r) return {};
	var t = {};
	for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
		if (-1 !== e.indexOf(n)) continue;
		t[n] = r[n];
	}
	return t;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/unitlessNumbers.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var unitlessNumbers$1 = {
	animationIterationCount: true,
	aspectRatio: true,
	borderImageOutset: true,
	borderImageSlice: true,
	borderImageWidth: true,
	boxFlex: true,
	boxFlexGroup: true,
	boxOrdinalGroup: true,
	columnCount: true,
	flex: true,
	flexGrow: true,
	flexOrder: true,
	flexPositive: true,
	flexShrink: true,
	flexNegative: true,
	fontWeight: true,
	gridRow: true,
	gridRowEnd: true,
	gridRowGap: true,
	gridRowStart: true,
	gridColumn: true,
	gridColumnEnd: true,
	gridColumnGap: true,
	gridColumnStart: true,
	lineClamp: true,
	opacity: true,
	order: true,
	orphans: true,
	tabSize: true,
	widows: true,
	zIndex: true,
	zoom: true,
	fillOpacity: true,
	floodOpacity: true,
	stopOpacity: true,
	strokeDasharray: true,
	strokeDashoffset: true,
	strokeMiterlimit: true,
	strokeOpacity: true,
	strokeWidth: true,
	scale: true,
	scaleX: true,
	scaleY: true,
	scaleZ: true,
	shadowOpacity: true
};
/**
* Support style names that may come passed in prefixed by adding permutations
* of vendor prefixes.
*/
var prefixes$2 = [
	"ms",
	"Moz",
	"O",
	"Webkit"
];
var prefixKey$1 = (prefix, key) => {
	return prefix + key.charAt(0).toUpperCase() + key.substring(1);
};
Object.keys(unitlessNumbers$1).forEach((prop) => {
	prefixes$2.forEach((prefix) => {
		unitlessNumbers$1[prefixKey$1(prefix, prop)] = unitlessNumbers$1[prop];
	});
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/isWebColor/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var isWebColor = (color) => color === "currentcolor" || color === "currentColor" || color === "inherit" || color.indexOf("var(") === 0;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/processColor/index.js
var import_normalize_colors = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function normalizeColor(color) {
		if (typeof color === "number") {
			if (color >>> 0 === color && color >= 0 && color <= 4294967295) return color;
			return null;
		}
		if (typeof color !== "string") return null;
		const matchers = getMatchers();
		let match;
		if (match = matchers.hex6.exec(color)) return parseInt(match[1] + "ff", 16) >>> 0;
		const colorFromKeyword = normalizeKeyword(color);
		if (colorFromKeyword != null) return colorFromKeyword;
		if (match = matchers.rgb.exec(color)) return (parse255(match[1]) << 24 | parse255(match[2]) << 16 | parse255(match[3]) << 8 | 255) >>> 0;
		if (match = matchers.rgba.exec(color)) {
			if (match[6] !== void 0) return (parse255(match[6]) << 24 | parse255(match[7]) << 16 | parse255(match[8]) << 8 | parse1(match[9])) >>> 0;
			return (parse255(match[2]) << 24 | parse255(match[3]) << 16 | parse255(match[4]) << 8 | parse1(match[5])) >>> 0;
		}
		if (match = matchers.hex3.exec(color)) return parseInt(match[1] + match[1] + match[2] + match[2] + match[3] + match[3] + "ff", 16) >>> 0;
		if (match = matchers.hex8.exec(color)) return parseInt(match[1], 16) >>> 0;
		if (match = matchers.hex4.exec(color)) return parseInt(match[1] + match[1] + match[2] + match[2] + match[3] + match[3] + match[4] + match[4], 16) >>> 0;
		if (match = matchers.hsl.exec(color)) return (hslToRgb(parse360(match[1]), parsePercentage(match[2]), parsePercentage(match[3])) | 255) >>> 0;
		if (match = matchers.hsla.exec(color)) {
			if (match[6] !== void 0) return (hslToRgb(parse360(match[6]), parsePercentage(match[7]), parsePercentage(match[8])) | parse1(match[9])) >>> 0;
			return (hslToRgb(parse360(match[2]), parsePercentage(match[3]), parsePercentage(match[4])) | parse1(match[5])) >>> 0;
		}
		if (match = matchers.hwb.exec(color)) return (hwbToRgb(parse360(match[1]), parsePercentage(match[2]), parsePercentage(match[3])) | 255) >>> 0;
		return null;
	}
	function hue2rgb(p, q, t) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}
	function hslToRgb(h, s, l) {
		const q = l < .5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		const r = hue2rgb(p, q, h + 1 / 3);
		const g = hue2rgb(p, q, h);
		const b = hue2rgb(p, q, h - 1 / 3);
		return Math.round(r * 255) << 24 | Math.round(g * 255) << 16 | Math.round(b * 255) << 8;
	}
	function hwbToRgb(h, w, b) {
		if (w + b >= 1) {
			const gray = Math.round(w * 255 / (w + b));
			return gray << 24 | gray << 16 | gray << 8;
		}
		const red = hue2rgb(0, 1, h + 1 / 3) * (1 - w - b) + w;
		const green = hue2rgb(0, 1, h) * (1 - w - b) + w;
		const blue = hue2rgb(0, 1, h - 1 / 3) * (1 - w - b) + w;
		return Math.round(red * 255) << 24 | Math.round(green * 255) << 16 | Math.round(blue * 255) << 8;
	}
	var NUMBER = "[-+]?\\d*\\.?\\d+";
	var PERCENTAGE = NUMBER + "%";
	function call(...args) {
		return "\\(\\s*(" + args.join(")\\s*,?\\s*(") + ")\\s*\\)";
	}
	function callWithSlashSeparator(...args) {
		return "\\(\\s*(" + args.slice(0, args.length - 1).join(")\\s*,?\\s*(") + ")\\s*/\\s*(" + args[args.length - 1] + ")\\s*\\)";
	}
	function commaSeparatedCall(...args) {
		return "\\(\\s*(" + args.join(")\\s*,\\s*(") + ")\\s*\\)";
	}
	var cachedMatchers;
	function getMatchers() {
		if (cachedMatchers === void 0) cachedMatchers = {
			rgb: new RegExp("rgb" + call(NUMBER, NUMBER, NUMBER)),
			rgba: new RegExp("rgba(" + commaSeparatedCall(NUMBER, NUMBER, NUMBER, NUMBER) + "|" + callWithSlashSeparator(NUMBER, NUMBER, NUMBER, NUMBER) + ")"),
			hsl: new RegExp("hsl" + call(NUMBER, PERCENTAGE, PERCENTAGE)),
			hsla: new RegExp("hsla(" + commaSeparatedCall(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) + "|" + callWithSlashSeparator(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) + ")"),
			hwb: new RegExp("hwb" + call(NUMBER, PERCENTAGE, PERCENTAGE)),
			hex3: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
			hex4: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
			hex6: /^#([0-9a-fA-F]{6})$/,
			hex8: /^#([0-9a-fA-F]{8})$/
		};
		return cachedMatchers;
	}
	function parse255(str) {
		const int = parseInt(str, 10);
		if (int < 0) return 0;
		if (int > 255) return 255;
		return int;
	}
	function parse360(str) {
		return (parseFloat(str) % 360 + 360) % 360 / 360;
	}
	function parse1(str) {
		const num = parseFloat(str);
		if (num < 0) return 0;
		if (num > 1) return 255;
		return Math.round(num * 255);
	}
	function parsePercentage(str) {
		const int = parseFloat(str);
		if (int < 0) return 0;
		if (int > 100) return 1;
		return int / 100;
	}
	function normalizeKeyword(name) {
		switch (name) {
			case "transparent": return 0;
			case "aliceblue": return 4042850303;
			case "antiquewhite": return 4209760255;
			case "aqua": return 16777215;
			case "aquamarine": return 2147472639;
			case "azure": return 4043309055;
			case "beige": return 4126530815;
			case "bisque": return 4293182719;
			case "black": return 255;
			case "blanchedalmond": return 4293643775;
			case "blue": return 65535;
			case "blueviolet": return 2318131967;
			case "brown": return 2771004159;
			case "burlywood": return 3736635391;
			case "burntsienna": return 3934150143;
			case "cadetblue": return 1604231423;
			case "chartreuse": return 2147418367;
			case "chocolate": return 3530104575;
			case "coral": return 4286533887;
			case "cornflowerblue": return 1687547391;
			case "cornsilk": return 4294499583;
			case "crimson": return 3692313855;
			case "cyan": return 16777215;
			case "darkblue": return 35839;
			case "darkcyan": return 9145343;
			case "darkgoldenrod": return 3095792639;
			case "darkgray": return 2846468607;
			case "darkgreen": return 6553855;
			case "darkgrey": return 2846468607;
			case "darkkhaki": return 3182914559;
			case "darkmagenta": return 2332068863;
			case "darkolivegreen": return 1433087999;
			case "darkorange": return 4287365375;
			case "darkorchid": return 2570243327;
			case "darkred": return 2332033279;
			case "darksalmon": return 3918953215;
			case "darkseagreen": return 2411499519;
			case "darkslateblue": return 1211993087;
			case "darkslategray": return 793726975;
			case "darkslategrey": return 793726975;
			case "darkturquoise": return 13554175;
			case "darkviolet": return 2483082239;
			case "deeppink": return 4279538687;
			case "deepskyblue": return 12582911;
			case "dimgray": return 1768516095;
			case "dimgrey": return 1768516095;
			case "dodgerblue": return 512819199;
			case "firebrick": return 2988581631;
			case "floralwhite": return 4294635775;
			case "forestgreen": return 579543807;
			case "fuchsia": return 4278255615;
			case "gainsboro": return 3705462015;
			case "ghostwhite": return 4177068031;
			case "gold": return 4292280575;
			case "goldenrod": return 3668254975;
			case "gray": return 2155905279;
			case "green": return 8388863;
			case "greenyellow": return 2919182335;
			case "grey": return 2155905279;
			case "honeydew": return 4043305215;
			case "hotpink": return 4285117695;
			case "indianred": return 3445382399;
			case "indigo": return 1258324735;
			case "ivory": return 4294963455;
			case "khaki": return 4041641215;
			case "lavender": return 3873897215;
			case "lavenderblush": return 4293981695;
			case "lawngreen": return 2096890111;
			case "lemonchiffon": return 4294626815;
			case "lightblue": return 2916673279;
			case "lightcoral": return 4034953471;
			case "lightcyan": return 3774873599;
			case "lightgoldenrodyellow": return 4210742015;
			case "lightgray": return 3553874943;
			case "lightgreen": return 2431553791;
			case "lightgrey": return 3553874943;
			case "lightpink": return 4290167295;
			case "lightsalmon": return 4288707327;
			case "lightseagreen": return 548580095;
			case "lightskyblue": return 2278488831;
			case "lightslategray": return 2005441023;
			case "lightslategrey": return 2005441023;
			case "lightsteelblue": return 2965692159;
			case "lightyellow": return 4294959359;
			case "lime": return 16711935;
			case "limegreen": return 852308735;
			case "linen": return 4210091775;
			case "magenta": return 4278255615;
			case "maroon": return 2147483903;
			case "mediumaquamarine": return 1724754687;
			case "mediumblue": return 52735;
			case "mediumorchid": return 3126187007;
			case "mediumpurple": return 2473647103;
			case "mediumseagreen": return 1018393087;
			case "mediumslateblue": return 2070474495;
			case "mediumspringgreen": return 16423679;
			case "mediumturquoise": return 1221709055;
			case "mediumvioletred": return 3340076543;
			case "midnightblue": return 421097727;
			case "mintcream": return 4127193855;
			case "mistyrose": return 4293190143;
			case "moccasin": return 4293178879;
			case "navajowhite": return 4292783615;
			case "navy": return 33023;
			case "oldlace": return 4260751103;
			case "olive": return 2155872511;
			case "olivedrab": return 1804477439;
			case "orange": return 4289003775;
			case "orangered": return 4282712319;
			case "orchid": return 3664828159;
			case "palegoldenrod": return 4008225535;
			case "palegreen": return 2566625535;
			case "paleturquoise": return 2951671551;
			case "palevioletred": return 3681588223;
			case "papayawhip": return 4293907967;
			case "peachpuff": return 4292524543;
			case "peru": return 3448061951;
			case "pink": return 4290825215;
			case "plum": return 3718307327;
			case "powderblue": return 2967529215;
			case "purple": return 2147516671;
			case "rebeccapurple": return 1714657791;
			case "red": return 4278190335;
			case "rosybrown": return 3163525119;
			case "royalblue": return 1097458175;
			case "saddlebrown": return 2336560127;
			case "salmon": return 4202722047;
			case "sandybrown": return 4104413439;
			case "seagreen": return 780883967;
			case "seashell": return 4294307583;
			case "sienna": return 2689740287;
			case "silver": return 3233857791;
			case "skyblue": return 2278484991;
			case "slateblue": return 1784335871;
			case "slategray": return 1887473919;
			case "slategrey": return 1887473919;
			case "snow": return 4294638335;
			case "springgreen": return 16744447;
			case "steelblue": return 1182971135;
			case "tan": return 3535047935;
			case "teal": return 8421631;
			case "thistle": return 3636451583;
			case "tomato": return 4284696575;
			case "turquoise": return 1088475391;
			case "violet": return 4001558271;
			case "wheat": return 4125012991;
			case "white": return 4294967295;
			case "whitesmoke": return 4126537215;
			case "yellow": return 4294902015;
			case "yellowgreen": return 2597139199;
		}
		return null;
	}
	module.exports = normalizeColor;
})))());
var processColor = (color) => {
	if (color === void 0 || color === null) return color;
	var int32Color = (0, import_normalize_colors.default)(color);
	if (int32Color === void 0 || int32Color === null) return;
	int32Color = (int32Color << 24 | int32Color >>> 8) >>> 0;
	return int32Color;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/normalizeColor.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var normalizeColor$3 = function normalizeColor(color, opacity) {
	if (opacity === void 0) opacity = 1;
	if (color == null) return;
	if (typeof color === "string" && isWebColor(color)) return color;
	var colorInt = processColor(color);
	if (colorInt != null) {
		var r = colorInt >> 16 & 255;
		var g = colorInt >> 8 & 255;
		var b = colorInt & 255;
		var alpha = ((colorInt >> 24 & 255) / 255 * opacity).toFixed(2);
		return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/normalizeValueWithProperty.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var colorProps = {
	backgroundColor: true,
	borderColor: true,
	borderTopColor: true,
	borderRightColor: true,
	borderBottomColor: true,
	borderLeftColor: true,
	color: true,
	shadowColor: true,
	textDecorationColor: true,
	textShadowColor: true
};
function normalizeValueWithProperty(value, property) {
	var returnValue = value;
	if ((property == null || !unitlessNumbers$1[property]) && typeof value === "number") returnValue = value + "px";
	else if (property != null && colorProps[property]) returnValue = normalizeColor$3(value);
	return returnValue;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/canUseDom/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* The browser implements the CSS cascade, where the order of properties is a
* factor in determining which styles to paint. React Native is different. It
* gives giving precedence to the more specific style property. For example,
* the value of `paddingTop` takes precedence over that of `padding`.
*
* This module creates mutally exclusive style declarations by expanding all of
* React Native's supported shortform properties (e.g. `padding`) to their
* longfrom equivalents.
*/
var emptyObject$11 = {};
var supportsCSS3TextDecoration = !canUseDOM || window.CSS != null && window.CSS.supports != null && (window.CSS.supports("text-decoration-line", "none") || window.CSS.supports("-webkit-text-decoration-line", "none"));
var MONOSPACE_FONT_STACK = "monospace,monospace";
var SYSTEM_FONT_STACK = "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif";
var STYLE_SHORT_FORM_EXPANSIONS = {
	borderColor: [
		"borderTopColor",
		"borderRightColor",
		"borderBottomColor",
		"borderLeftColor"
	],
	borderBlockColor: ["borderTopColor", "borderBottomColor"],
	borderInlineColor: ["borderRightColor", "borderLeftColor"],
	borderRadius: [
		"borderTopLeftRadius",
		"borderTopRightRadius",
		"borderBottomRightRadius",
		"borderBottomLeftRadius"
	],
	borderStyle: [
		"borderTopStyle",
		"borderRightStyle",
		"borderBottomStyle",
		"borderLeftStyle"
	],
	borderBlockStyle: ["borderTopStyle", "borderBottomStyle"],
	borderInlineStyle: ["borderRightStyle", "borderLeftStyle"],
	borderWidth: [
		"borderTopWidth",
		"borderRightWidth",
		"borderBottomWidth",
		"borderLeftWidth"
	],
	borderBlockWidth: ["borderTopWidth", "borderBottomWidth"],
	borderInlineWidth: ["borderRightWidth", "borderLeftWidth"],
	insetBlock: ["top", "bottom"],
	insetInline: ["left", "right"],
	marginBlock: ["marginTop", "marginBottom"],
	marginInline: ["marginRight", "marginLeft"],
	paddingBlock: ["paddingTop", "paddingBottom"],
	paddingInline: ["paddingRight", "paddingLeft"],
	overflow: ["overflowX", "overflowY"],
	overscrollBehavior: ["overscrollBehaviorX", "overscrollBehaviorY"],
	borderBlockStartColor: ["borderTopColor"],
	borderBlockStartStyle: ["borderTopStyle"],
	borderBlockStartWidth: ["borderTopWidth"],
	borderBlockEndColor: ["borderBottomColor"],
	borderBlockEndStyle: ["borderBottomStyle"],
	borderBlockEndWidth: ["borderBottomWidth"],
	borderEndStartRadius: ["borderBottomLeftRadius"],
	borderEndEndRadius: ["borderBottomRightRadius"],
	borderStartStartRadius: ["borderTopLeftRadius"],
	borderStartEndRadius: ["borderTopRightRadius"],
	insetBlockEnd: ["bottom"],
	insetBlockStart: ["top"],
	marginBlockStart: ["marginTop"],
	marginBlockEnd: ["marginBottom"],
	paddingBlockStart: ["paddingTop"],
	paddingBlockEnd: ["paddingBottom"]
};
/**
* Reducer
*/
var createReactDOMStyle = (style, isInline) => {
	if (!style) return emptyObject$11;
	var resolvedStyle = {};
	var _loop = function _loop() {
		var value = style[prop];
		if (value == null) return "continue";
		if (prop === "backgroundClip") {
			if (value === "text") {
				resolvedStyle.backgroundClip = value;
				resolvedStyle.WebkitBackgroundClip = value;
			}
		} else if (prop === "flex") {
			if (value === -1) {
				resolvedStyle.flexGrow = 0;
				resolvedStyle.flexShrink = 1;
				resolvedStyle.flexBasis = "auto";
			} else resolvedStyle.flex = value;
		} else if (prop === "font") resolvedStyle[prop] = value.replace("System", SYSTEM_FONT_STACK);
		else if (prop === "fontFamily") {
			if (value.indexOf("System") > -1) {
				var stack = value.split(/,\s*/);
				stack[stack.indexOf("System")] = SYSTEM_FONT_STACK;
				resolvedStyle[prop] = stack.join(",");
			} else if (value === "monospace") resolvedStyle[prop] = MONOSPACE_FONT_STACK;
			else resolvedStyle[prop] = value;
		} else if (prop === "textDecorationLine") {
			if (!supportsCSS3TextDecoration) resolvedStyle.textDecoration = value;
			else resolvedStyle.textDecorationLine = value;
		} else if (prop === "writingDirection") resolvedStyle.direction = value;
		else {
			var _value = normalizeValueWithProperty(style[prop], prop);
			var longFormProperties = STYLE_SHORT_FORM_EXPANSIONS[prop];
			if (isInline && prop === "inset") {
				if (style.insetInline == null) {
					resolvedStyle.left = _value;
					resolvedStyle.right = _value;
				}
				if (style.insetBlock == null) {
					resolvedStyle.top = _value;
					resolvedStyle.bottom = _value;
				}
			} else if (isInline && prop === "margin") {
				if (style.marginInline == null) {
					resolvedStyle.marginLeft = _value;
					resolvedStyle.marginRight = _value;
				}
				if (style.marginBlock == null) {
					resolvedStyle.marginTop = _value;
					resolvedStyle.marginBottom = _value;
				}
			} else if (isInline && prop === "padding") {
				if (style.paddingInline == null) {
					resolvedStyle.paddingLeft = _value;
					resolvedStyle.paddingRight = _value;
				}
				if (style.paddingBlock == null) {
					resolvedStyle.paddingTop = _value;
					resolvedStyle.paddingBottom = _value;
				}
			} else if (longFormProperties) longFormProperties.forEach((longForm, i) => {
				if (style[longForm] == null) resolvedStyle[longForm] = _value;
			});
			else resolvedStyle[prop] = _value;
		}
	};
	for (var prop in style) if (_loop() === "continue") continue;
	return resolvedStyle;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/hash.js
/**
* JS Implementation of MurmurHash2
*
* @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
* @see http://github.com/garycourt/murmurhash-js
* @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
* @see http://sites.google.com/site/murmurhash/
*
* @param {string} str ASCII only
* @param {number} seed Positive integer only
* @return {number} 32-bit positive integer hash
*
* 
*/
function murmurhash2_32_gc(str, seed) {
	var l = str.length, h = seed ^ l, i = 0, k;
	while (l >= 4) {
		k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
		k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
		k ^= k >>> 24;
		k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
		h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16) ^ k;
		l -= 4;
		++i;
	}
	switch (l) {
		case 3: h ^= (str.charCodeAt(i + 2) & 255) << 16;
		case 2: h ^= (str.charCodeAt(i + 1) & 255) << 8;
		case 1:
			h ^= str.charCodeAt(i) & 255;
			h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
	}
	h ^= h >>> 13;
	h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
	h ^= h >>> 15;
	return h >>> 0;
}
var hash = (str) => murmurhash2_32_gc(str, 1).toString(36);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/hyphenateStyleName.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var uppercasePattern$2 = /[A-Z]/g;
var msPattern$1 = /^ms-/;
var cache$4 = {};
function toHyphenLower$2(match) {
	return "-" + match.toLowerCase();
}
function hyphenateStyleName$1(name) {
	if (name in cache$4) return cache$4[name];
	var hName = name.replace(uppercasePattern$2, toHyphenLower$2);
	return cache$4[name] = msPattern$1.test(hName) ? "-" + hName : hName;
}
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/utils/capitalizeString.js
var require_capitalizeString = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = capitalizeString;
	function capitalizeString(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/utils/prefixProperty.js
var require_prefixProperty = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = prefixProperty;
	var _capitalizeString2 = _interopRequireDefault(require_capitalizeString());
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	function prefixProperty(prefixProperties, property, style) {
		var requiredPrefixes = prefixProperties[property];
		if (requiredPrefixes && style.hasOwnProperty(property)) {
			var capitalizedProperty = (0, _capitalizeString2.default)(property);
			for (var i = 0; i < requiredPrefixes.length; ++i) {
				var prefixedProperty = requiredPrefixes[i] + capitalizedProperty;
				if (!style[prefixedProperty]) style[prefixedProperty] = style[property];
			}
		}
		return style;
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/utils/prefixValue.js
var require_prefixValue = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = prefixValue;
	function prefixValue(plugins, property, value, style, metaData) {
		for (var i = 0, len = plugins.length; i < len; ++i) {
			var processedValue = plugins[i](property, value, style, metaData);
			if (processedValue) return processedValue;
		}
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/utils/addNewValuesOnly.js
var require_addNewValuesOnly = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = addNewValuesOnly;
	function addIfNew(list, value) {
		if (list.indexOf(value) === -1) list.push(value);
	}
	function addNewValuesOnly(list, values) {
		if (Array.isArray(values)) for (var i = 0, len = values.length; i < len; ++i) addIfNew(list, values[i]);
		else addIfNew(list, values);
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/utils/isObject.js
var require_isObject = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = isObject;
	function isObject(value) {
		return value instanceof Object && !Array.isArray(value);
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/createPrefixer.js
var require_createPrefixer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = createPrefixer;
	var _prefixProperty2 = _interopRequireDefault(require_prefixProperty());
	var _prefixValue2 = _interopRequireDefault(require_prefixValue());
	var _addNewValuesOnly2 = _interopRequireDefault(require_addNewValuesOnly());
	var _isObject2 = _interopRequireDefault(require_isObject());
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	function createPrefixer(_ref) {
		var prefixMap = _ref.prefixMap, plugins = _ref.plugins;
		return function prefix(style) {
			for (var property in style) {
				var value = style[property];
				if ((0, _isObject2.default)(value)) style[property] = prefix(value);
				else if (Array.isArray(value)) {
					var combinedValue = [];
					for (var i = 0, len = value.length; i < len; ++i) {
						var processedValue = (0, _prefixValue2.default)(plugins, property, value[i], style, prefixMap);
						(0, _addNewValuesOnly2.default)(combinedValue, processedValue || value[i]);
					}
					if (combinedValue.length > 0) style[property] = combinedValue;
				} else {
					var _processedValue = (0, _prefixValue2.default)(plugins, property, value, style, prefixMap);
					if (_processedValue) style[property] = _processedValue;
					style = (0, _prefixProperty2.default)(prefixMap, property, style);
				}
			}
			return style;
		};
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/assignStyle.js
function _typeof(obj) {
	"@babel/helpers - typeof";
	if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") _typeof = function _typeof(obj) {
		return typeof obj;
	};
	else _typeof = function _typeof(obj) {
		return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	};
	return _typeof(obj);
}
function _toConsumableArray(arr) {
	return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray$1(arr) || _nonIterableSpread();
}
function _nonIterableSpread() {
	throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$1(o, minLen) {
	if (!o) return;
	if (typeof o === "string") return _arrayLikeToArray$1(o, minLen);
	var n = Object.prototype.toString.call(o).slice(8, -1);
	if (n === "Object" && o.constructor) n = o.constructor.name;
	if (n === "Map" || n === "Set") return Array.from(n);
	if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen);
}
function _iterableToArray(iter) {
	if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
}
function _arrayWithoutHoles(arr) {
	if (Array.isArray(arr)) return _arrayLikeToArray$1(arr);
}
function _arrayLikeToArray$1(arr, len) {
	if (len == null || len > arr.length) len = arr.length;
	for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
	return arr2;
}
function filterUniqueArray(arr) {
	return arr.filter(function(val, index) {
		return arr.lastIndexOf(val) === index;
	});
}
function assignStyle(base) {
	for (var i = 0, len = arguments.length <= 1 ? 0 : arguments.length - 1; i < len; ++i) {
		var style = i + 1 < 1 || arguments.length <= i + 1 ? void 0 : arguments[i + 1];
		for (var property in style) {
			var value = style[property];
			var baseValue = base[property];
			if (baseValue && value) {
				if (Array.isArray(baseValue)) {
					base[property] = filterUniqueArray(baseValue.concat(value));
					continue;
				}
				if (Array.isArray(value)) {
					base[property] = filterUniqueArray([baseValue].concat(_toConsumableArray(value)));
					continue;
				}
				if (_typeof(value) === "object") {
					base[property] = assignStyle({}, baseValue, value);
					continue;
				}
			}
			base[property] = value;
		}
	}
	return base;
}
var init_assignStyle = __esmMin((() => {}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/camelCaseProperty.js
function toUpper(match) {
	return match[1].toUpperCase();
}
function camelCaseProperty(property) {
	if (cache$3.hasOwnProperty(property)) return cache$3[property];
	var camelProp = property.replace(DASH, toUpper).replace(MS, "ms");
	cache$3[property] = camelProp;
	return camelProp;
}
var DASH, MS, cache$3;
var init_camelCaseProperty = __esmMin((() => {
	DASH = /-([a-z])/g;
	MS = /^Ms/g;
	cache$3 = {};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/hyphenate-style-name@1.1.0/node_modules/hyphenate-style-name/index.js
var hyphenate_style_name_exports = /* @__PURE__ */ __exportAll({ default: () => hyphenateStyleName });
function toHyphenLower$1(match) {
	return "-" + match.toLowerCase();
}
function hyphenateStyleName(name) {
	if (cache$2.hasOwnProperty(name)) return cache$2[name];
	var hName = name.replace(uppercasePattern$1, toHyphenLower$1);
	return cache$2[name] = msPattern.test(hName) ? "-" + hName : hName;
}
var uppercasePattern$1, msPattern, cache$2;
var init_hyphenate_style_name = __esmMin((() => {
	uppercasePattern$1 = /[A-Z]/g;
	msPattern = /^ms-/;
	cache$2 = {};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/hyphenateProperty.js
function hyphenateProperty(property) {
	return hyphenateStyleName(property);
}
var init_hyphenateProperty = __esmMin((() => {
	init_hyphenate_style_name();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/cssifyDeclaration.js
function cssifyDeclaration(property, value) {
	return hyphenateProperty(property) + ":" + value;
}
var init_cssifyDeclaration = __esmMin((() => {
	init_hyphenateProperty();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/cssifyObject.js
function cssifyObject(style) {
	var css = "";
	for (var property in style) {
		var value = style[property];
		if (typeof value !== "string" && typeof value !== "number") continue;
		if (css) css += ";";
		css += cssifyDeclaration(property, value);
	}
	return css;
}
var init_cssifyObject = __esmMin((() => {
	init_cssifyDeclaration();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/isPrefixedProperty.js
function isPrefixedProperty(property) {
	return RE$3.test(property);
}
var RE$3;
var init_isPrefixedProperty = __esmMin((() => {
	RE$3 = /^(Webkit|Moz|O|ms)/;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/isPrefixedValue.js
function isPrefixedValue(value) {
	return typeof value === "string" && RE$2.test(value);
}
var RE$2;
var init_isPrefixedValue = __esmMin((() => {
	RE$2 = /-webkit-|-moz-|-ms-/;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/isUnitlessProperty.js
function getPrefixedProperty(prefix, property) {
	return prefix + property.charAt(0).toUpperCase() + property.slice(1);
}
function isUnitlessProperty(property) {
	return unitlessProperties.hasOwnProperty(property);
}
var unitlessProperties, prefixedUnitlessProperties, prefixes$1, i, len, property, j, jLen;
var init_isUnitlessProperty = __esmMin((() => {
	init_hyphenateProperty();
	unitlessProperties = {
		borderImageOutset: true,
		borderImageSlice: true,
		borderImageWidth: true,
		fontWeight: true,
		lineHeight: true,
		opacity: true,
		orphans: true,
		tabSize: true,
		widows: true,
		zIndex: true,
		zoom: true,
		fillOpacity: true,
		floodOpacity: true,
		stopOpacity: true,
		strokeDasharray: true,
		strokeDashoffset: true,
		strokeMiterlimit: true,
		strokeOpacity: true,
		strokeWidth: true
	};
	prefixedUnitlessProperties = [
		"animationIterationCount",
		"boxFlex",
		"boxFlexGroup",
		"boxOrdinalGroup",
		"columnCount",
		"flex",
		"flexGrow",
		"flexPositive",
		"flexShrink",
		"flexNegative",
		"flexOrder",
		"gridColumn",
		"gridColumnEnd",
		"gridColumnStart",
		"gridRow",
		"gridRowEnd",
		"gridRowStart",
		"lineClamp",
		"order"
	];
	prefixes$1 = [
		"Webkit",
		"ms",
		"Moz",
		"O"
	];
	for (i = 0, len = prefixedUnitlessProperties.length; i < len; ++i) {
		property = prefixedUnitlessProperties[i];
		unitlessProperties[property] = true;
		for (j = 0, jLen = prefixes$1.length; j < jLen; ++j) unitlessProperties[getPrefixedProperty(prefixes$1[j], property)] = true;
	}
	for (var _property in unitlessProperties) unitlessProperties[hyphenateProperty(_property)] = true;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/unprefixProperty.js
function unprefixProperty(property) {
	var propertyWithoutPrefix = property.replace(RE$1, "");
	return propertyWithoutPrefix.charAt(0).toLowerCase() + propertyWithoutPrefix.slice(1);
}
var RE$1;
var init_unprefixProperty = __esmMin((() => {
	RE$1 = /^(ms|Webkit|Moz|O)/;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/normalizeProperty.js
function normalizeProperty(property) {
	return unprefixProperty(camelCaseProperty(property));
}
var init_normalizeProperty = __esmMin((() => {
	init_camelCaseProperty();
	init_unprefixProperty();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/resolveArrayValue.js
function resolveArrayValue(property, value) {
	return value.join(";" + hyphenateProperty(property) + ":");
}
var init_resolveArrayValue = __esmMin((() => {
	init_hyphenateProperty();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/unprefixValue.js
function unprefixValue(value) {
	if (typeof value === "string") return value.replace(RE, "");
	return value;
}
var RE;
var init_unprefixValue = __esmMin((() => {
	RE = /(-ms-|-webkit-|-moz-|-o-)/g;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/es/index.js
var es_exports = /* @__PURE__ */ __exportAll({
	assignStyle: () => assignStyle,
	camelCaseProperty: () => camelCaseProperty,
	cssifyDeclaration: () => cssifyDeclaration,
	cssifyObject: () => cssifyObject,
	hyphenateProperty: () => hyphenateProperty,
	isPrefixedProperty: () => isPrefixedProperty,
	isPrefixedValue: () => isPrefixedValue,
	isUnitlessProperty: () => isUnitlessProperty,
	normalizeProperty: () => normalizeProperty,
	resolveArrayValue: () => resolveArrayValue,
	unprefixProperty: () => unprefixProperty,
	unprefixValue: () => unprefixValue
});
var init_es = __esmMin((() => {
	init_assignStyle();
	init_camelCaseProperty();
	init_cssifyDeclaration();
	init_cssifyObject();
	init_hyphenateProperty();
	init_isPrefixedProperty();
	init_isPrefixedValue();
	init_isUnitlessProperty();
	init_normalizeProperty();
	init_resolveArrayValue();
	init_unprefixProperty();
	init_unprefixValue();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/crossFade.js
var require_crossFade = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = crossFade;
	var _cssInJsUtils = (init_es(), __toCommonJS(es_exports));
	var CROSS_FADE_REGEX = /cross-fade\(/g;
	var prefixes = ["-webkit-", ""];
	function crossFade(property, value) {
		if (typeof value === "string" && !(0, _cssInJsUtils.isPrefixedValue)(value) && value.indexOf("cross-fade(") !== -1) return prefixes.map(function(prefix) {
			return value.replace(CROSS_FADE_REGEX, prefix + "cross-fade(");
		});
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/lib/isPrefixedValue.js
var require_isPrefixedValue = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports["default"] = isPrefixedValue;
	var RE = /-webkit-|-moz-|-ms-/;
	function isPrefixedValue(value) {
		return typeof value === "string" && RE.test(value);
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/imageSet.js
var require_imageSet = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = imageSet;
	var _isPrefixedValue2 = _interopRequireDefault(require_isPrefixedValue());
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var prefixes = ["-webkit-", ""];
	function imageSet(property, value) {
		if (typeof value === "string" && !(0, _isPrefixedValue2.default)(value) && value.indexOf("image-set(") > -1) return prefixes.map(function(prefix) {
			return value.replace(/image-set\(/g, prefix + "image-set(");
		});
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/logical.js
var require_logical = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = logical;
	var alternativeProps = {
		marginBlockStart: ["WebkitMarginBefore"],
		marginBlockEnd: ["WebkitMarginAfter"],
		marginInlineStart: ["WebkitMarginStart", "MozMarginStart"],
		marginInlineEnd: ["WebkitMarginEnd", "MozMarginEnd"],
		paddingBlockStart: ["WebkitPaddingBefore"],
		paddingBlockEnd: ["WebkitPaddingAfter"],
		paddingInlineStart: ["WebkitPaddingStart", "MozPaddingStart"],
		paddingInlineEnd: ["WebkitPaddingEnd", "MozPaddingEnd"],
		borderBlockStart: ["WebkitBorderBefore"],
		borderBlockStartColor: ["WebkitBorderBeforeColor"],
		borderBlockStartStyle: ["WebkitBorderBeforeStyle"],
		borderBlockStartWidth: ["WebkitBorderBeforeWidth"],
		borderBlockEnd: ["WebkitBorderAfter"],
		borderBlockEndColor: ["WebkitBorderAfterColor"],
		borderBlockEndStyle: ["WebkitBorderAfterStyle"],
		borderBlockEndWidth: ["WebkitBorderAfterWidth"],
		borderInlineStart: ["WebkitBorderStart", "MozBorderStart"],
		borderInlineStartColor: ["WebkitBorderStartColor", "MozBorderStartColor"],
		borderInlineStartStyle: ["WebkitBorderStartStyle", "MozBorderStartStyle"],
		borderInlineStartWidth: ["WebkitBorderStartWidth", "MozBorderStartWidth"],
		borderInlineEnd: ["WebkitBorderEnd", "MozBorderEnd"],
		borderInlineEndColor: ["WebkitBorderEndColor", "MozBorderEndColor"],
		borderInlineEndStyle: ["WebkitBorderEndStyle", "MozBorderEndStyle"],
		borderInlineEndWidth: ["WebkitBorderEndWidth", "MozBorderEndWidth"]
	};
	function logical(property, value, style) {
		if (Object.prototype.hasOwnProperty.call(alternativeProps, property)) {
			var alternativePropList = alternativeProps[property];
			for (var i = 0, len = alternativePropList.length; i < len; ++i) style[alternativePropList[i]] = value;
		}
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/position.js
var require_position = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = position;
	function position(property, value) {
		if (property === "position" && value === "sticky") return ["-webkit-sticky", "sticky"];
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/sizing.js
var require_sizing = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = sizing;
	var prefixes = [
		"-webkit-",
		"-moz-",
		""
	];
	var properties = {
		maxHeight: true,
		maxWidth: true,
		width: true,
		height: true,
		columnWidth: true,
		minWidth: true,
		minHeight: true
	};
	var values = {
		"min-content": true,
		"max-content": true,
		"fill-available": true,
		"fit-content": true,
		"contain-floats": true
	};
	function sizing(property, value) {
		if (properties.hasOwnProperty(property) && values.hasOwnProperty(value)) return prefixes.map(function(prefix) {
			return prefix + value;
		});
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/css-in-js-utils@3.1.0/node_modules/css-in-js-utils/lib/hyphenateProperty.js
var require_hyphenateProperty = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports["default"] = hyphenateProperty;
	var _hyphenateStyleName2 = _interopRequireDefault((init_hyphenate_style_name(), __toCommonJS(hyphenate_style_name_exports)));
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { "default": obj };
	}
	function hyphenateProperty(property) {
		return (0, _hyphenateStyleName2["default"])(property);
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/inline-style-prefixer@7.0.1/node_modules/inline-style-prefixer/lib/plugins/transition.js
var require_transition = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = transition;
	var _hyphenateProperty2 = _interopRequireDefault(require_hyphenateProperty());
	var _isPrefixedValue2 = _interopRequireDefault(require_isPrefixedValue());
	var _capitalizeString2 = _interopRequireDefault(require_capitalizeString());
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var properties = {
		transition: true,
		transitionProperty: true,
		WebkitTransition: true,
		WebkitTransitionProperty: true,
		MozTransition: true,
		MozTransitionProperty: true
	};
	var prefixMapping = {
		Webkit: "-webkit-",
		Moz: "-moz-",
		ms: "-ms-"
	};
	function prefixValue(value, propertyPrefixMap) {
		if ((0, _isPrefixedValue2.default)(value)) return value;
		var multipleValues = value.split(/,(?![^()]*(?:\([^()]*\))?\))/g);
		for (var i = 0, len = multipleValues.length; i < len; ++i) {
			var singleValue = multipleValues[i];
			var values = [singleValue];
			for (var property in propertyPrefixMap) {
				var dashCaseProperty = (0, _hyphenateProperty2.default)(property);
				if (singleValue.indexOf(dashCaseProperty) > -1 && dashCaseProperty !== "order") {
					var prefixes = propertyPrefixMap[property];
					for (var j = 0, pLen = prefixes.length; j < pLen; ++j) values.unshift(singleValue.replace(dashCaseProperty, prefixMapping[prefixes[j]] + dashCaseProperty));
				}
			}
			multipleValues[i] = values.join(",");
		}
		return multipleValues.join(",");
	}
	function transition(property, value, style, propertyPrefixMap) {
		if (typeof value === "string" && properties.hasOwnProperty(property)) {
			var outputValue = prefixValue(value, propertyPrefixMap);
			var webkitOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function(val) {
				return !/-moz-|-ms-/.test(val);
			}).join(",");
			if (property.indexOf("Webkit") > -1) return webkitOutput;
			var mozOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function(val) {
				return !/-webkit-|-ms-/.test(val);
			}).join(",");
			if (property.indexOf("Moz") > -1) return mozOutput;
			style["Webkit" + (0, _capitalizeString2.default)(property)] = webkitOutput;
			style["Moz" + (0, _capitalizeString2.default)(property)] = mozOutput;
			return outputValue;
		}
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/prefixStyles/static.js
var import_createPrefixer = /* @__PURE__ */ __toESM(require_createPrefixer());
var import_crossFade = /* @__PURE__ */ __toESM(require_crossFade());
var import_imageSet = /* @__PURE__ */ __toESM(require_imageSet());
var import_logical = /* @__PURE__ */ __toESM(require_logical());
var import_position = /* @__PURE__ */ __toESM(require_position());
var import_sizing = /* @__PURE__ */ __toESM(require_sizing());
var import_transition = /* @__PURE__ */ __toESM(require_transition());
var w = ["Webkit"];
var m = ["Moz"];
var wm = ["Webkit", "Moz"];
var wms = ["Webkit", "ms"];
var static_default = {
	plugins: [
		import_crossFade.default,
		import_imageSet.default,
		import_logical.default,
		import_position.default,
		import_sizing.default,
		import_transition.default
	],
	prefixMap: {
		appearance: [
			"Webkit",
			"Moz",
			"ms"
		],
		userSelect: wm,
		textEmphasisPosition: wms,
		textEmphasis: wms,
		textEmphasisStyle: wms,
		textEmphasisColor: wms,
		boxDecorationBreak: wms,
		clipPath: w,
		maskImage: wms,
		maskMode: wms,
		maskRepeat: wms,
		maskPosition: wms,
		maskClip: wms,
		maskOrigin: wms,
		maskSize: wms,
		maskComposite: wms,
		mask: wms,
		maskBorderSource: wms,
		maskBorderMode: wms,
		maskBorderSlice: wms,
		maskBorderWidth: wms,
		maskBorderOutset: wms,
		maskBorderRepeat: wms,
		maskBorder: wms,
		maskType: wms,
		textDecorationStyle: w,
		textDecorationSkip: w,
		textDecorationLine: w,
		textDecorationColor: w,
		filter: w,
		breakAfter: w,
		breakBefore: w,
		breakInside: w,
		columnCount: w,
		columnFill: w,
		columnGap: w,
		columnRule: w,
		columnRuleColor: w,
		columnRuleStyle: w,
		columnRuleWidth: w,
		columns: w,
		columnSpan: w,
		columnWidth: w,
		backdropFilter: w,
		hyphens: w,
		flowInto: w,
		flowFrom: w,
		regionFragment: w,
		textOrientation: w,
		tabSize: m,
		fontKerning: w,
		textSizeAdjust: w
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/prefixStyles/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var prefixAll = (0, import_createPrefixer.default)(static_default);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/compiler/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$26 = ["animationKeyframes"];
var cache$1 = /* @__PURE__ */ new Map();
var emptyObject$10 = {};
var classicGroup = 1;
var atomicGroup = 3;
var customGroup = {
	borderColor: 2,
	borderRadius: 2,
	borderStyle: 2,
	borderWidth: 2,
	display: 2,
	flex: 2,
	inset: 2,
	margin: 2,
	overflow: 2,
	overscrollBehavior: 2,
	padding: 2,
	insetBlock: 2.1,
	insetInline: 2.1,
	marginInline: 2.1,
	marginBlock: 2.1,
	paddingInline: 2.1,
	paddingBlock: 2.1,
	borderBlockStartColor: 2.2,
	borderBlockStartStyle: 2.2,
	borderBlockStartWidth: 2.2,
	borderBlockEndColor: 2.2,
	borderBlockEndStyle: 2.2,
	borderBlockEndWidth: 2.2,
	borderInlineStartColor: 2.2,
	borderInlineStartStyle: 2.2,
	borderInlineStartWidth: 2.2,
	borderInlineEndColor: 2.2,
	borderInlineEndStyle: 2.2,
	borderInlineEndWidth: 2.2,
	borderEndStartRadius: 2.2,
	borderEndEndRadius: 2.2,
	borderStartStartRadius: 2.2,
	borderStartEndRadius: 2.2,
	insetBlockEnd: 2.2,
	insetBlockStart: 2.2,
	insetInlineEnd: 2.2,
	insetInlineStart: 2.2,
	marginBlockStart: 2.2,
	marginBlockEnd: 2.2,
	marginInlineStart: 2.2,
	marginInlineEnd: 2.2,
	paddingBlockStart: 2.2,
	paddingBlockEnd: 2.2,
	paddingInlineStart: 2.2,
	paddingInlineEnd: 2.2
};
var borderTopLeftRadius = "borderTopLeftRadius";
var borderTopRightRadius = "borderTopRightRadius";
var borderBottomLeftRadius = "borderBottomLeftRadius";
var borderBottomRightRadius = "borderBottomRightRadius";
var borderLeftColor = "borderLeftColor";
var borderLeftStyle = "borderLeftStyle";
var borderLeftWidth = "borderLeftWidth";
var borderRightColor = "borderRightColor";
var borderRightStyle = "borderRightStyle";
var borderRightWidth = "borderRightWidth";
var right = "right";
var marginLeft = "marginLeft";
var marginRight = "marginRight";
var paddingLeft = "paddingLeft";
var paddingRight = "paddingRight";
var left = "left";
var PROPERTIES_FLIP = {
	[borderTopLeftRadius]: borderTopRightRadius,
	[borderTopRightRadius]: borderTopLeftRadius,
	[borderBottomLeftRadius]: borderBottomRightRadius,
	[borderBottomRightRadius]: borderBottomLeftRadius,
	[borderLeftColor]: borderRightColor,
	[borderLeftStyle]: borderRightStyle,
	[borderLeftWidth]: borderRightWidth,
	[borderRightColor]: borderLeftColor,
	[borderRightStyle]: borderLeftStyle,
	[borderRightWidth]: borderLeftWidth,
	[left]: right,
	[marginLeft]: marginRight,
	[marginRight]: marginLeft,
	[paddingLeft]: paddingRight,
	[paddingRight]: paddingLeft,
	[right]: left
};
var PROPERTIES_I18N = {
	borderStartStartRadius: borderTopLeftRadius,
	borderStartEndRadius: borderTopRightRadius,
	borderEndStartRadius: borderBottomLeftRadius,
	borderEndEndRadius: borderBottomRightRadius,
	borderInlineStartColor: borderLeftColor,
	borderInlineStartStyle: borderLeftStyle,
	borderInlineStartWidth: borderLeftWidth,
	borderInlineEndColor: borderRightColor,
	borderInlineEndStyle: borderRightStyle,
	borderInlineEndWidth: borderRightWidth,
	insetInlineEnd: right,
	insetInlineStart: left,
	marginInlineStart: marginLeft,
	marginInlineEnd: marginRight,
	paddingInlineStart: paddingLeft,
	paddingInlineEnd: paddingRight
};
var PROPERTIES_VALUE = [
	"clear",
	"float",
	"textAlign"
];
function atomic(style) {
	var compiledStyle = { $$css: true };
	var compiledRules = [];
	function atomicCompile(srcProp, prop, value) {
		var valueString = stringifyValueWithProperty(value, prop);
		var cacheKey = prop + valueString;
		var cachedResult = cache$1.get(cacheKey);
		var identifier;
		if (cachedResult != null) {
			identifier = cachedResult[0];
			compiledRules.push(cachedResult[1]);
		} else {
			identifier = createIdentifier("r", srcProp, srcProp !== prop ? cacheKey : valueString);
			var order = customGroup[srcProp] || atomicGroup;
			var orderedRules = [createAtomicRules(identifier, prop, value), order];
			compiledRules.push(orderedRules);
			cache$1.set(cacheKey, [identifier, orderedRules]);
		}
		return identifier;
	}
	Object.keys(style).sort().forEach((srcProp) => {
		var value = style[srcProp];
		if (value != null) {
			var localizeableValue;
			if (PROPERTIES_VALUE.indexOf(srcProp) > -1) {
				var _left = atomicCompile(srcProp, srcProp, "left");
				var _right = atomicCompile(srcProp, srcProp, "right");
				if (value === "start") localizeableValue = [_left, _right];
				else if (value === "end") localizeableValue = [_right, _left];
			}
			var propPolyfill = PROPERTIES_I18N[srcProp];
			if (propPolyfill != null) localizeableValue = [atomicCompile(srcProp, propPolyfill, value), atomicCompile(srcProp, PROPERTIES_FLIP[propPolyfill], value)];
			if (srcProp === "transitionProperty") {
				var values = Array.isArray(value) ? value : [value];
				var polyfillIndices = [];
				for (var i = 0; i < values.length; i++) {
					var val = values[i];
					if (typeof val === "string" && PROPERTIES_I18N[val] != null) polyfillIndices.push(i);
				}
				if (polyfillIndices.length > 0) {
					var ltrPolyfillValues = [...values];
					var rtlPolyfillValues = [...values];
					polyfillIndices.forEach((i) => {
						var ltrVal = ltrPolyfillValues[i];
						if (typeof ltrVal === "string") {
							var ltrPolyfill = PROPERTIES_I18N[ltrVal];
							var rtlPolyfill = PROPERTIES_FLIP[ltrPolyfill];
							ltrPolyfillValues[i] = ltrPolyfill;
							rtlPolyfillValues[i] = rtlPolyfill;
							localizeableValue = [atomicCompile(srcProp, srcProp, ltrPolyfillValues), atomicCompile(srcProp, srcProp, rtlPolyfillValues)];
						}
					});
				}
			}
			if (localizeableValue == null) localizeableValue = atomicCompile(srcProp, srcProp, value);
			else compiledStyle["$$css$localize"] = true;
			compiledStyle[srcProp] = localizeableValue;
		}
	});
	return [compiledStyle, compiledRules];
}
/**
* Compile simple style object to classic CSS rules.
* No support for 'placeholderTextColor', 'scrollbarWidth', or 'pointerEvents'.
*/
function classic(style, name) {
	var compiledStyle = { $$css: true };
	var compiledRules = [];
	var animationKeyframes = style.animationKeyframes, rest = _objectWithoutPropertiesLoose(style, _excluded$26);
	var identifier = createIdentifier("css", name, JSON.stringify(style));
	var selector = "." + identifier;
	var animationName;
	if (animationKeyframes != null) {
		var _processKeyframesValu = processKeyframesValue(animationKeyframes), animationNames = _processKeyframesValu[0], keyframesRules = _processKeyframesValu[1];
		animationName = animationNames.join(",");
		compiledRules.push(...keyframesRules);
	}
	var block = createDeclarationBlock(_objectSpread2(_objectSpread2({}, rest), {}, { animationName }));
	compiledRules.push("" + selector + block);
	compiledStyle[identifier] = identifier;
	return [compiledStyle, [[compiledRules, classicGroup]]];
}
/**
* Compile simple style object to inline DOM styles.
* No support for 'animationKeyframes', 'placeholderTextColor', 'scrollbarWidth', or 'pointerEvents'.
*/
function inline(originalStyle, isRTL) {
	var style = originalStyle || emptyObject$10;
	var frozenProps = {};
	var nextStyle = {};
	var _loop = function _loop() {
		var originalValue = style[originalProp];
		var prop = originalProp;
		var value = originalValue;
		if (!Object.prototype.hasOwnProperty.call(style, originalProp) || originalValue == null) return "continue";
		if (PROPERTIES_VALUE.indexOf(originalProp) > -1) {
			if (originalValue === "start") value = isRTL ? "right" : "left";
			else if (originalValue === "end") value = isRTL ? "left" : "right";
		}
		var propPolyfill = PROPERTIES_I18N[originalProp];
		if (propPolyfill != null) prop = isRTL ? PROPERTIES_FLIP[propPolyfill] : propPolyfill;
		if (originalProp === "transitionProperty") {
			var originalValues = Array.isArray(originalValue) ? originalValue : [originalValue];
			originalValues.forEach((val, i) => {
				if (typeof val === "string") {
					var valuePolyfill = PROPERTIES_I18N[val];
					if (valuePolyfill != null) {
						originalValues[i] = isRTL ? PROPERTIES_FLIP[valuePolyfill] : valuePolyfill;
						value = originalValues.join(" ");
					}
				}
			});
		}
		if (!frozenProps[prop]) nextStyle[prop] = value;
		if (prop === originalProp) frozenProps[prop] = true;
	};
	for (var originalProp in style) if (_loop() === "continue") continue;
	return createReactDOMStyle(nextStyle, true);
}
/**
* Create a value string that normalizes different input values with a common
* output.
*/
function stringifyValueWithProperty(value, property) {
	var normalizedValue = normalizeValueWithProperty(value, property);
	return typeof normalizedValue !== "string" ? JSON.stringify(normalizedValue || "") : normalizedValue;
}
/**
* Create the Atomic CSS rules needed for a given StyleSheet rule.
* Translates StyleSheet declarations to CSS.
*/
function createAtomicRules(identifier, property, value) {
	var rules = [];
	var selector = "." + identifier;
	switch (property) {
		case "animationKeyframes":
			var _processKeyframesValu2 = processKeyframesValue(value), animationNames = _processKeyframesValu2[0], keyframesRules = _processKeyframesValu2[1];
			var block = createDeclarationBlock({ animationName: animationNames.join(",") });
			rules.push("" + selector + block, ...keyframesRules);
			break;
		case "placeholderTextColor":
			var _block = createDeclarationBlock({
				color: value,
				opacity: 1
			});
			rules.push(selector + "::-webkit-input-placeholder" + _block, selector + "::-moz-placeholder" + _block, selector + ":-ms-input-placeholder" + _block, selector + "::placeholder" + _block);
			break;
		case "pointerEvents":
			var finalValue = value;
			if (value === "auto") finalValue = "auto!important";
			else if (value === "none") {
				finalValue = "none!important";
				var _block2 = createDeclarationBlock({ pointerEvents: "none" });
				rules.push(selector + ">* " + _block2);
			} else if (value === "box-none") {
				finalValue = "none!important";
				var _block3 = createDeclarationBlock({ pointerEvents: "auto" });
				rules.push(selector + ">* " + _block3);
			} else if (value === "box-only") {
				finalValue = "auto!important";
				var _block4 = createDeclarationBlock({ pointerEvents: "none" });
				rules.push(selector + ">* " + _block4);
			}
			var _block5 = createDeclarationBlock({ pointerEvents: finalValue });
			rules.push("" + selector + _block5);
			break;
		case "scrollbarWidth":
			if (value === "none") rules.push(selector + "::-webkit-scrollbar{display:none}");
			var _block6 = createDeclarationBlock({ scrollbarWidth: value });
			rules.push("" + selector + _block6);
			break;
		default:
			var _block7 = createDeclarationBlock({ [property]: value });
			rules.push("" + selector + _block7);
	}
	return rules;
}
/**
* Creates a CSS declaration block from a StyleSheet object.
*/
function createDeclarationBlock(style) {
	var domStyle = prefixAll(createReactDOMStyle(style));
	return "{" + Object.keys(domStyle).map((property) => {
		var value = domStyle[property];
		var prop = hyphenateStyleName$1(property);
		if (Array.isArray(value)) return value.map((v) => prop + ":" + v).join(";");
		else return prop + ":" + value;
	}).sort().join(";") + ";}";
}
/**
* An identifier is associated with a unique set of styles.
*/
function createIdentifier(prefix, name, key) {
	var hashedString = hash(name + key);
	return prefix + "-" + name + "-" + hashedString;
}
/**
* Create individual CSS keyframes rules.
*/
function createKeyframes(keyframes) {
	var prefixes = ["-webkit-", ""];
	var identifier = createIdentifier("r", "animation", JSON.stringify(keyframes));
	var steps = "{" + Object.keys(keyframes).map((stepName) => {
		var rule = keyframes[stepName];
		var block = createDeclarationBlock(rule);
		return "" + stepName + block;
	}).join("") + "}";
	return [identifier, prefixes.map((prefix) => {
		return "@" + prefix + "keyframes " + identifier + steps;
	})];
}
/**
* Create CSS keyframes rules and names from a StyleSheet keyframes object.
*/
function processKeyframesValue(keyframesValue) {
	if (typeof keyframesValue === "number") throw new Error("Invalid CSS keyframes type: " + typeof keyframesValue);
	var animationNames = [];
	var rules = [];
	(Array.isArray(keyframesValue) ? keyframesValue : [keyframesValue]).forEach((keyframes) => {
		if (typeof keyframes === "string") animationNames.push(keyframes);
		else {
			var _createKeyframes = createKeyframes(keyframes), identifier = _createKeyframes[0], keyframesRules = _createKeyframes[1];
			animationNames.push(identifier);
			rules.push(...keyframesRules);
		}
	});
	return [animationNames, rules];
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/dom/createCSSStyleSheet.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function createCSSStyleSheet(id, rootNode, textContent) {
	if (canUseDOM) {
		var root = rootNode != null ? rootNode : document;
		var element = root.getElementById(id);
		if (element == null) {
			element = document.createElement("style");
			element.setAttribute("id", id);
			if (typeof textContent === "string") element.appendChild(document.createTextNode(textContent));
			if (root instanceof ShadowRoot) root.insertBefore(element, root.firstChild);
			else {
				var head = root.head;
				if (head) head.insertBefore(element, head.firstChild);
			}
		}
		return element.sheet;
	} else return null;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var slice = Array.prototype.slice;
/**
* Order-based insertion of CSS.
*
* Each rule is associated with a numerically defined group.
* Groups are ordered within the style sheet according to their number, with the
* lowest first.
*
* Groups are implemented using marker rules. The selector of the first rule of
* each group is used only to encode the group number for hydration. An
* alternative implementation could rely on CSSMediaRule, allowing groups to be
* treated as a sub-sheet, but the Edge implementation of CSSMediaRule is
* broken.
* https://developer.mozilla.org/en-US/docs/Web/API/CSSMediaRule
* https://gist.github.com/necolas/aa0c37846ad6bd3b05b727b959e82674
*/
function createOrderedCSSStyleSheet(sheet) {
	var groups = {};
	var selectors = {};
	/**
	* Hydrate approximate record from any existing rules in the sheet.
	*/
	if (sheet != null) {
		var group;
		slice.call(sheet.cssRules).forEach((cssRule, i) => {
			var cssText = cssRule.cssText;
			if (cssText.indexOf("stylesheet-group") > -1) {
				group = decodeGroupRule(cssRule);
				groups[group] = {
					start: i,
					rules: [cssText]
				};
			} else {
				var selectorText = getSelectorText(cssText);
				if (selectorText != null) {
					selectors[selectorText] = true;
					groups[group].rules.push(cssText);
				}
			}
		});
	}
	function sheetInsert(sheet, group, text) {
		var orderedGroups = getOrderedGroups(groups);
		var nextGroupIndex = orderedGroups.indexOf(group) + 1;
		var nextGroup = orderedGroups[nextGroupIndex];
		var position = nextGroup != null && groups[nextGroup].start != null ? groups[nextGroup].start : sheet.cssRules.length;
		var isInserted = insertRuleAt(sheet, text, position);
		if (isInserted) {
			if (groups[group].start == null) groups[group].start = position;
			for (var i = nextGroupIndex; i < orderedGroups.length; i += 1) {
				var groupNumber = orderedGroups[i];
				var previousStart = groups[groupNumber].start || 0;
				groups[groupNumber].start = previousStart + 1;
			}
		}
		return isInserted;
	}
	return {
		/**
		* The textContent of the style sheet.
		*/
		getTextContent() {
			return getOrderedGroups(groups).map((group) => {
				var rules = groups[group].rules;
				var marker = rules.shift();
				rules.sort();
				rules.unshift(marker);
				return rules.join("\n");
			}).join("\n");
		},
		/**
		* Insert a rule into the style sheet
		*/
		insert(cssText, groupValue) {
			var group = Number(groupValue);
			if (groups[group] == null) {
				var markerRule = encodeGroupRule(group);
				groups[group] = {
					start: null,
					rules: [markerRule]
				};
				if (sheet != null) sheetInsert(sheet, group, markerRule);
			}
			var selectorText = getSelectorText(cssText);
			if (selectorText != null && selectors[selectorText] == null) {
				selectors[selectorText] = true;
				groups[group].rules.push(cssText);
				if (sheet != null) {
					if (!sheetInsert(sheet, group, cssText)) groups[group].rules.pop();
				}
			}
		}
	};
}
/**
* Helper functions
*/
function encodeGroupRule(group) {
	return "[stylesheet-group=\"" + group + "\"]{}";
}
var groupPattern = /["']/g;
function decodeGroupRule(cssRule) {
	return Number(cssRule.selectorText.split(groupPattern)[1]);
}
function getOrderedGroups(obj) {
	return Object.keys(obj).map(Number).sort((a, b) => a > b ? 1 : -1);
}
var selectorPattern = /\s*([,])\s*/g;
function getSelectorText(cssText) {
	var selector = cssText.split("{")[0].trim();
	return selector !== "" ? selector.replace(selectorPattern, "$1") : null;
}
function insertRuleAt(root, cssText, position) {
	try {
		root.insertRule(cssText, position);
		return true;
	} catch (e) {
		return false;
	}
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/dom/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var defaultId = "react-native-stylesheet";
var roots = /* @__PURE__ */ new WeakMap();
var sheets = [];
var initialRules = [
	"html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:rgba(0,0,0,0);}",
	"body{margin:0;}",
	"button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0;}",
	"input::-webkit-search-cancel-button,input::-webkit-search-decoration,input::-webkit-search-results-button,input::-webkit-search-results-decoration{display:none;}"
];
function createSheet(root, id) {
	if (id === void 0) id = defaultId;
	var sheet;
	if (canUseDOM) {
		var rootNode = root != null ? root.getRootNode() : document;
		if (sheets.length === 0) {
			sheet = createOrderedCSSStyleSheet(createCSSStyleSheet(id));
			initialRules.forEach((rule) => {
				sheet.insert(rule, 0);
			});
			roots.set(rootNode, sheets.length);
			sheets.push(sheet);
		} else {
			var index = roots.get(rootNode);
			if (index == null) {
				var initialSheet = sheets[0];
				var textContent = initialSheet != null ? initialSheet.getTextContent() : "";
				sheet = createOrderedCSSStyleSheet(createCSSStyleSheet(id, rootNode, textContent));
				roots.set(rootNode, sheets.length);
				sheets.push(sheet);
			} else sheet = sheets[index];
		}
	} else if (sheets.length === 0) {
		sheet = createOrderedCSSStyleSheet(createCSSStyleSheet(id));
		initialRules.forEach((rule) => {
			sheet.insert(rule, 0);
		});
		sheets.push(sheet);
	} else sheet = sheets[0];
	return {
		getTextContent() {
			return sheet.getTextContent();
		},
		id,
		insert(cssText, groupValue) {
			sheets.forEach((s) => {
				s.insert(cssText, groupValue);
			});
		}
	};
}
//#endregion
//#region ../../../../node_modules/.pnpm/styleq@0.1.3/node_modules/styleq/dist/transform-localize-style.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_transform_localize_style$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.localizeStyle = localizeStyle;
	var cache = /* @__PURE__ */ new WeakMap();
	var markerProp = "$$css$localize";
	/**
	* The compiler polyfills logical properties and values, generating a class
	* name for both writing directions. The style objects are annotated by
	* the compiler as needing this runtime transform. The results are memoized.
	*
	* { '$$css$localize': true, float: [ 'float-left', 'float-right' ] }
	* => { float: 'float-left' }
	*/
	function compileStyle(style, isRTL) {
		var compiledStyle = {};
		for (var prop in style) if (prop !== markerProp) {
			var value = style[prop];
			if (Array.isArray(value)) compiledStyle[prop] = isRTL ? value[1] : value[0];
			else compiledStyle[prop] = value;
		}
		return compiledStyle;
	}
	function localizeStyle(style, isRTL) {
		if (style[markerProp] != null) {
			var compiledStyleIndex = isRTL ? 1 : 0;
			if (cache.has(style)) {
				var _cachedStyles = cache.get(style);
				var _compiledStyle = _cachedStyles[compiledStyleIndex];
				if (_compiledStyle == null) {
					_compiledStyle = compileStyle(style, isRTL);
					_cachedStyles[compiledStyleIndex] = _compiledStyle;
					cache.set(style, _cachedStyles);
				}
				return _compiledStyle;
			}
			var compiledStyle = compileStyle(style, isRTL);
			var cachedStyles = new Array(2);
			cachedStyles[compiledStyleIndex] = compiledStyle;
			cache.set(style, cachedStyles);
			return compiledStyle;
		}
		return style;
	}
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/warnOnce/index.js
var import_transform_localize_style = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Copyright (c) Nicolas Gallagher
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	module.exports = require_transform_localize_style$1();
})))();
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var warnedKeys = {};
/**
* A simple function that prints a warning message once per session.
*
* @param {string} key - The key used to ensure the message is printed once.
*                       This should be unique to the callsite.
* @param {string} message - The message to print
*/
function warnOnce(key, message) {
	if (warnedKeys[key]) return;
	console.warn(message);
	warnedKeys[key] = true;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/preprocess.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var emptyObject$9 = {};
/**
* Shadows
*/
var defaultOffset = {
	height: 0,
	width: 0
};
var createBoxShadowValue = (style) => {
	var shadowColor = style.shadowColor, shadowOffset = style.shadowOffset, shadowOpacity = style.shadowOpacity, shadowRadius = style.shadowRadius;
	var _ref = shadowOffset || defaultOffset, height = _ref.height, width = _ref.width;
	var offsetX = normalizeValueWithProperty(width);
	var offsetY = normalizeValueWithProperty(height);
	var blurRadius = normalizeValueWithProperty(shadowRadius || 0);
	var color = normalizeColor$3(shadowColor || "black", shadowOpacity);
	if (color != null && offsetX != null && offsetY != null && blurRadius != null) return offsetX + " " + offsetY + " " + blurRadius + " " + color;
};
var createTextShadowValue = (style) => {
	var textShadowColor = style.textShadowColor, textShadowOffset = style.textShadowOffset, textShadowRadius = style.textShadowRadius;
	var _ref2 = textShadowOffset || defaultOffset, height = _ref2.height, width = _ref2.width;
	var radius = textShadowRadius || 0;
	var offsetX = normalizeValueWithProperty(width);
	var offsetY = normalizeValueWithProperty(height);
	var blurRadius = normalizeValueWithProperty(radius);
	var color = normalizeValueWithProperty(textShadowColor, "textShadowColor");
	if (color && (height !== 0 || width !== 0 || radius !== 0) && offsetX != null && offsetY != null && blurRadius != null) return offsetX + " " + offsetY + " " + blurRadius + " " + color;
};
var mapBoxShadow = (boxShadow) => {
	if (typeof boxShadow === "string") return boxShadow;
	var offsetX = normalizeValueWithProperty(boxShadow.offsetX) || 0;
	var offsetY = normalizeValueWithProperty(boxShadow.offsetY) || 0;
	var blurRadius = normalizeValueWithProperty(boxShadow.blurRadius) || 0;
	var spreadDistance = normalizeValueWithProperty(boxShadow.spreadDistance) || 0;
	var color = normalizeColor$3(boxShadow.color) || "black";
	return (boxShadow.inset ? "inset " : "") + offsetX + " " + offsetY + " " + blurRadius + " " + spreadDistance + " " + color;
};
var createBoxShadowArrayValue = (value) => {
	return value.map(mapBoxShadow).join(", ");
};
var mapTransform = (transform) => {
	var type = Object.keys(transform)[0];
	var value = transform[type];
	if (type === "matrix" || type === "matrix3d") return type + "(" + value.join(",") + ")";
	else {
		var normalizedValue = normalizeValueWithProperty(value, type);
		return type + "(" + normalizedValue + ")";
	}
};
var createTransformValue = (value) => {
	return value.map(mapTransform).join(" ");
};
var createTransformOriginValue = (value) => {
	return value.map((v) => normalizeValueWithProperty(v)).join(" ");
};
var PROPERTIES_STANDARD = {
	borderBottomEndRadius: "borderEndEndRadius",
	borderBottomStartRadius: "borderEndStartRadius",
	borderTopEndRadius: "borderStartEndRadius",
	borderTopStartRadius: "borderStartStartRadius",
	borderEndColor: "borderInlineEndColor",
	borderEndStyle: "borderInlineEndStyle",
	borderEndWidth: "borderInlineEndWidth",
	borderStartColor: "borderInlineStartColor",
	borderStartStyle: "borderInlineStartStyle",
	borderStartWidth: "borderInlineStartWidth",
	end: "insetInlineEnd",
	marginEnd: "marginInlineEnd",
	marginHorizontal: "marginInline",
	marginStart: "marginInlineStart",
	marginVertical: "marginBlock",
	paddingEnd: "paddingInlineEnd",
	paddingHorizontal: "paddingInline",
	paddingStart: "paddingInlineStart",
	paddingVertical: "paddingBlock",
	start: "insetInlineStart"
};
var ignoredProps = {
	elevation: true,
	overlayColor: true,
	resizeMode: true,
	tintColor: true
};
/**
* Preprocess styles
*/
var preprocess = function preprocess(originalStyle, options) {
	if (options === void 0) options = {};
	var style = originalStyle || emptyObject$9;
	var nextStyle = {};
	if (options.shadow, style.shadowColor != null || style.shadowOffset != null || style.shadowOpacity != null || style.shadowRadius != null) {
		warnOnce("shadowStyles", "\"shadow*\" style props are deprecated. Use \"boxShadow\".");
		var boxShadowValue = createBoxShadowValue(style);
		if (boxShadowValue != null) nextStyle.boxShadow = boxShadowValue;
	}
	if (options.textShadow, style.textShadowColor != null || style.textShadowOffset != null || style.textShadowRadius != null) {
		warnOnce("textShadowStyles", "\"textShadow*\" style props are deprecated. Use \"textShadow\".");
		var textShadowValue = createTextShadowValue(style);
		if (textShadowValue != null && nextStyle.textShadow == null) {
			var textShadow = style.textShadow;
			nextStyle.textShadow = textShadow ? textShadow + ", " + textShadowValue : textShadowValue;
		}
	}
	for (var originalProp in style) {
		if (ignoredProps[originalProp] != null || originalProp === "shadowColor" || originalProp === "shadowOffset" || originalProp === "shadowOpacity" || originalProp === "shadowRadius" || originalProp === "textShadowColor" || originalProp === "textShadowOffset" || originalProp === "textShadowRadius") continue;
		var originalValue = style[originalProp];
		var prop = PROPERTIES_STANDARD[originalProp] || originalProp;
		var _value = originalValue;
		if (!Object.prototype.hasOwnProperty.call(style, originalProp) || prop !== originalProp && style[prop] != null) continue;
		if (prop === "aspectRatio" && typeof _value === "number") nextStyle[prop] = _value.toString();
		else if (prop === "boxShadow") {
			if (Array.isArray(_value)) _value = createBoxShadowArrayValue(_value);
			var boxShadow = nextStyle.boxShadow;
			nextStyle.boxShadow = boxShadow ? _value + ", " + boxShadow : _value;
		} else if (prop === "fontVariant") {
			if (Array.isArray(_value) && _value.length > 0) _value = _value.join(" ");
			nextStyle[prop] = _value;
		} else if (prop === "textAlignVertical") {
			if (style.verticalAlign == null) nextStyle.verticalAlign = _value === "center" ? "middle" : _value;
		} else if (prop === "transform") {
			if (Array.isArray(_value)) _value = createTransformValue(_value);
			nextStyle.transform = _value;
		} else if (prop === "transformOrigin") {
			if (Array.isArray(_value)) _value = createTransformOriginValue(_value);
			nextStyle.transformOrigin = _value;
		} else nextStyle[prop] = _value;
	}
	return nextStyle;
};
//#endregion
//#region ../../../../node_modules/.pnpm/styleq@0.1.3/node_modules/styleq/dist/styleq.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var require_styleq = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.styleq = void 0;
	var cache = /* @__PURE__ */ new WeakMap();
	var compiledKey = "$$css";
	function createStyleq(options) {
		var disableCache;
		var disableMix;
		var transform;
		if (options != null) {
			disableCache = options.disableCache === true;
			disableMix = options.disableMix === true;
			transform = options.transform;
		}
		return function styleq() {
			var definedProperties = [];
			var className = "";
			var inlineStyle = null;
			var nextCache = disableCache ? null : cache;
			var styles = new Array(arguments.length);
			for (var i = 0; i < arguments.length; i++) styles[i] = arguments[i];
			while (styles.length > 0) {
				var possibleStyle = styles.pop();
				if (possibleStyle == null || possibleStyle === false) continue;
				if (Array.isArray(possibleStyle)) {
					for (var _i = 0; _i < possibleStyle.length; _i++) styles.push(possibleStyle[_i]);
					continue;
				}
				var style = transform != null ? transform(possibleStyle) : possibleStyle;
				if (style.$$css) {
					var classNameChunk = "";
					if (nextCache != null && nextCache.has(style)) {
						var cacheEntry = nextCache.get(style);
						if (cacheEntry != null) {
							classNameChunk = cacheEntry[0];
							definedProperties.push.apply(definedProperties, cacheEntry[1]);
							nextCache = cacheEntry[2];
						}
					} else {
						var definedPropertiesChunk = [];
						for (var prop in style) {
							var value = style[prop];
							if (prop === compiledKey) continue;
							if (typeof value === "string" || value === null) {
								if (!definedProperties.includes(prop)) {
									definedProperties.push(prop);
									if (nextCache != null) definedPropertiesChunk.push(prop);
									if (typeof value === "string") classNameChunk += classNameChunk ? " " + value : value;
								}
							} else console.error("styleq: ".concat(prop, " typeof ").concat(String(value), " is not \"string\" or \"null\"."));
						}
						if (nextCache != null) {
							var weakMap = /* @__PURE__ */ new WeakMap();
							nextCache.set(style, [
								classNameChunk,
								definedPropertiesChunk,
								weakMap
							]);
							nextCache = weakMap;
						}
					}
					if (classNameChunk) className = className ? classNameChunk + " " + className : classNameChunk;
				} else if (disableMix) {
					if (inlineStyle == null) inlineStyle = {};
					inlineStyle = Object.assign({}, style, inlineStyle);
				} else {
					var subStyle = null;
					for (var _prop in style) {
						var _value = style[_prop];
						if (_value !== void 0) {
							if (!definedProperties.includes(_prop)) {
								if (_value != null) {
									if (inlineStyle == null) inlineStyle = {};
									if (subStyle == null) subStyle = {};
									subStyle[_prop] = _value;
								}
								definedProperties.push(_prop);
								nextCache = null;
							}
						}
					}
					if (subStyle != null) inlineStyle = Object.assign(subStyle, inlineStyle);
				}
			}
			return [className, inlineStyle];
		};
	}
	var styleq = createStyleq();
	exports.styleq = styleq;
	styleq.factory = createStyleq;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/postcss-value-parser@4.2.0/node_modules/postcss-value-parser/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var openParentheses = "(".charCodeAt(0);
	var closeParentheses = ")".charCodeAt(0);
	var singleQuote = "'".charCodeAt(0);
	var doubleQuote = "\"".charCodeAt(0);
	var backslash = "\\".charCodeAt(0);
	var slash = "/".charCodeAt(0);
	var comma = ",".charCodeAt(0);
	var colon = ":".charCodeAt(0);
	var star = "*".charCodeAt(0);
	var uLower = "u".charCodeAt(0);
	var uUpper = "U".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var isUnicodeRange = /^[a-f0-9?-]+$/i;
	module.exports = function(input) {
		var tokens = [];
		var value = input;
		var next, quote, prev, token, escape, escapePos, whitespacePos, parenthesesOpenPos;
		var pos = 0;
		var code = value.charCodeAt(pos);
		var max = value.length;
		var stack = [{ nodes: tokens }];
		var balanced = 0;
		var parent;
		var name = "";
		var before = "";
		var after = "";
		while (pos < max) if (code <= 32) {
			next = pos;
			do {
				next += 1;
				code = value.charCodeAt(next);
			} while (code <= 32);
			token = value.slice(pos, next);
			prev = tokens[tokens.length - 1];
			if (code === closeParentheses && balanced) after = token;
			else if (prev && prev.type === "div") {
				prev.after = token;
				prev.sourceEndIndex += token.length;
			} else if (code === comma || code === colon || code === slash && value.charCodeAt(next + 1) !== star && (!parent || parent && parent.type === "function" && parent.value !== "calc")) before = token;
			else tokens.push({
				type: "space",
				sourceIndex: pos,
				sourceEndIndex: next,
				value: token
			});
			pos = next;
		} else if (code === singleQuote || code === doubleQuote) {
			next = pos;
			quote = code === singleQuote ? "'" : "\"";
			token = {
				type: "string",
				sourceIndex: pos,
				quote
			};
			do {
				escape = false;
				next = value.indexOf(quote, next + 1);
				if (~next) {
					escapePos = next;
					while (value.charCodeAt(escapePos - 1) === backslash) {
						escapePos -= 1;
						escape = !escape;
					}
				} else {
					value += quote;
					next = value.length - 1;
					token.unclosed = true;
				}
			} while (escape);
			token.value = value.slice(pos + 1, next);
			token.sourceEndIndex = token.unclosed ? next : next + 1;
			tokens.push(token);
			pos = next + 1;
			code = value.charCodeAt(pos);
		} else if (code === slash && value.charCodeAt(pos + 1) === star) {
			next = value.indexOf("*/", pos);
			token = {
				type: "comment",
				sourceIndex: pos,
				sourceEndIndex: next + 2
			};
			if (next === -1) {
				token.unclosed = true;
				next = value.length;
				token.sourceEndIndex = next;
			}
			token.value = value.slice(pos + 2, next);
			tokens.push(token);
			pos = next + 2;
			code = value.charCodeAt(pos);
		} else if ((code === slash || code === star) && parent && parent.type === "function" && parent.value === "calc") {
			token = value[pos];
			tokens.push({
				type: "word",
				sourceIndex: pos - before.length,
				sourceEndIndex: pos + token.length,
				value: token
			});
			pos += 1;
			code = value.charCodeAt(pos);
		} else if (code === slash || code === comma || code === colon) {
			token = value[pos];
			tokens.push({
				type: "div",
				sourceIndex: pos - before.length,
				sourceEndIndex: pos + token.length,
				value: token,
				before,
				after: ""
			});
			before = "";
			pos += 1;
			code = value.charCodeAt(pos);
		} else if (openParentheses === code) {
			next = pos;
			do {
				next += 1;
				code = value.charCodeAt(next);
			} while (code <= 32);
			parenthesesOpenPos = pos;
			token = {
				type: "function",
				sourceIndex: pos - name.length,
				value: name,
				before: value.slice(parenthesesOpenPos + 1, next)
			};
			pos = next;
			if (name === "url" && code !== singleQuote && code !== doubleQuote) {
				next -= 1;
				do {
					escape = false;
					next = value.indexOf(")", next + 1);
					if (~next) {
						escapePos = next;
						while (value.charCodeAt(escapePos - 1) === backslash) {
							escapePos -= 1;
							escape = !escape;
						}
					} else {
						value += ")";
						next = value.length - 1;
						token.unclosed = true;
					}
				} while (escape);
				whitespacePos = next;
				do {
					whitespacePos -= 1;
					code = value.charCodeAt(whitespacePos);
				} while (code <= 32);
				if (parenthesesOpenPos < whitespacePos) {
					if (pos !== whitespacePos + 1) token.nodes = [{
						type: "word",
						sourceIndex: pos,
						sourceEndIndex: whitespacePos + 1,
						value: value.slice(pos, whitespacePos + 1)
					}];
					else token.nodes = [];
					if (token.unclosed && whitespacePos + 1 !== next) {
						token.after = "";
						token.nodes.push({
							type: "space",
							sourceIndex: whitespacePos + 1,
							sourceEndIndex: next,
							value: value.slice(whitespacePos + 1, next)
						});
					} else {
						token.after = value.slice(whitespacePos + 1, next);
						token.sourceEndIndex = next;
					}
				} else {
					token.after = "";
					token.nodes = [];
				}
				pos = next + 1;
				token.sourceEndIndex = token.unclosed ? next : pos;
				code = value.charCodeAt(pos);
				tokens.push(token);
			} else {
				balanced += 1;
				token.after = "";
				token.sourceEndIndex = pos + 1;
				tokens.push(token);
				stack.push(token);
				tokens = token.nodes = [];
				parent = token;
			}
			name = "";
		} else if (closeParentheses === code && balanced) {
			pos += 1;
			code = value.charCodeAt(pos);
			parent.after = after;
			parent.sourceEndIndex += after.length;
			after = "";
			balanced -= 1;
			stack[stack.length - 1].sourceEndIndex = pos;
			stack.pop();
			parent = stack[balanced];
			tokens = parent.nodes;
		} else {
			next = pos;
			do {
				if (code === backslash) next += 1;
				next += 1;
				code = value.charCodeAt(next);
			} while (next < max && !(code <= 32 || code === singleQuote || code === doubleQuote || code === comma || code === colon || code === slash || code === openParentheses || code === star && parent && parent.type === "function" && parent.value === "calc" || code === slash && parent.type === "function" && parent.value === "calc" || code === closeParentheses && balanced));
			token = value.slice(pos, next);
			if (openParentheses === code) name = token;
			else if ((uLower === token.charCodeAt(0) || uUpper === token.charCodeAt(0)) && plus === token.charCodeAt(1) && isUnicodeRange.test(token.slice(2))) tokens.push({
				type: "unicode-range",
				sourceIndex: pos,
				sourceEndIndex: next,
				value: token
			});
			else tokens.push({
				type: "word",
				sourceIndex: pos,
				sourceEndIndex: next,
				value: token
			});
			pos = next;
		}
		for (pos = stack.length - 1; pos; pos -= 1) {
			stack[pos].unclosed = true;
			stack[pos].sourceEndIndex = value.length;
		}
		return stack[0].nodes;
	};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/postcss-value-parser@4.2.0/node_modules/postcss-value-parser/lib/walk.js
var require_walk = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function walk(nodes, cb, bubble) {
		var i = 0, max = nodes.length, node, result;
		for (; i < max; i += 1) {
			node = nodes[i];
			if (!bubble) result = cb(node, i, nodes);
			if (result !== false && node.type === "function" && Array.isArray(node.nodes)) walk(node.nodes, cb, bubble);
			if (bubble) cb(node, i, nodes);
		}
	};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/postcss-value-parser@4.2.0/node_modules/postcss-value-parser/lib/stringify.js
var require_stringify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function stringifyNode(node, custom) {
		var type = node.type;
		var value = node.value;
		var buf;
		var customResult;
		if (custom && (customResult = custom(node)) !== void 0) return customResult;
		else if (type === "word" || type === "space") return value;
		else if (type === "string") {
			buf = node.quote || "";
			return buf + value + (node.unclosed ? "" : buf);
		} else if (type === "comment") return "/*" + value + (node.unclosed ? "" : "*/");
		else if (type === "div") return (node.before || "") + value + (node.after || "");
		else if (Array.isArray(node.nodes)) {
			buf = stringify(node.nodes, custom);
			if (type !== "function") return buf;
			return value + "(" + (node.before || "") + buf + (node.after || "") + (node.unclosed ? "" : ")");
		}
		return value;
	}
	function stringify(nodes, custom) {
		var result, i;
		if (Array.isArray(nodes)) {
			result = "";
			for (i = nodes.length - 1; ~i; i -= 1) result = stringifyNode(nodes[i], custom) + result;
			return result;
		}
		return stringifyNode(nodes, custom);
	}
	module.exports = stringify;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/postcss-value-parser@4.2.0/node_modules/postcss-value-parser/lib/unit.js
var require_unit = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var minus = "-".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var dot = ".".charCodeAt(0);
	var exp = "e".charCodeAt(0);
	var EXP = "E".charCodeAt(0);
	function likeNumber(value) {
		var code = value.charCodeAt(0);
		var nextCode;
		if (code === plus || code === minus) {
			nextCode = value.charCodeAt(1);
			if (nextCode >= 48 && nextCode <= 57) return true;
			var nextNextCode = value.charCodeAt(2);
			if (nextCode === dot && nextNextCode >= 48 && nextNextCode <= 57) return true;
			return false;
		}
		if (code === dot) {
			nextCode = value.charCodeAt(1);
			if (nextCode >= 48 && nextCode <= 57) return true;
			return false;
		}
		if (code >= 48 && code <= 57) return true;
		return false;
	}
	module.exports = function(value) {
		var pos = 0;
		var length = value.length;
		var code;
		var nextCode;
		var nextNextCode;
		if (length === 0 || !likeNumber(value)) return false;
		code = value.charCodeAt(pos);
		if (code === plus || code === minus) pos++;
		while (pos < length) {
			code = value.charCodeAt(pos);
			if (code < 48 || code > 57) break;
			pos += 1;
		}
		code = value.charCodeAt(pos);
		nextCode = value.charCodeAt(pos + 1);
		if (code === dot && nextCode >= 48 && nextCode <= 57) {
			pos += 2;
			while (pos < length) {
				code = value.charCodeAt(pos);
				if (code < 48 || code > 57) break;
				pos += 1;
			}
		}
		code = value.charCodeAt(pos);
		nextCode = value.charCodeAt(pos + 1);
		nextNextCode = value.charCodeAt(pos + 2);
		if ((code === exp || code === EXP) && (nextCode >= 48 && nextCode <= 57 || (nextCode === plus || nextCode === minus) && nextNextCode >= 48 && nextNextCode <= 57)) {
			pos += nextCode === plus || nextCode === minus ? 3 : 2;
			while (pos < length) {
				code = value.charCodeAt(pos);
				if (code < 48 || code > 57) break;
				pos += 1;
			}
		}
		return {
			number: value.slice(0, pos),
			unit: value.slice(pos)
		};
	};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/postcss-value-parser@4.2.0/node_modules/postcss-value-parser/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var walk = require_walk();
	var stringify = require_stringify();
	function ValueParser(value) {
		if (this instanceof ValueParser) {
			this.nodes = parse(value);
			return this;
		}
		return new ValueParser(value);
	}
	ValueParser.prototype.toString = function() {
		return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
	};
	ValueParser.prototype.walk = function(cb, bubble) {
		walk(this.nodes, cb, bubble);
		return this;
	};
	ValueParser.unit = require_unit();
	ValueParser.walk = walk;
	ValueParser.stringify = stringify;
	module.exports = ValueParser;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/validate.js
var import_styleq = require_styleq();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var invalidShortforms = {
	background: true,
	borderBottom: true,
	borderLeft: true,
	borderRight: true,
	borderTop: true,
	font: true,
	grid: true,
	outline: true,
	textDecoration: true
};
var invalidMultiValueShortforms = {
	flex: true,
	margin: true,
	padding: true,
	borderColor: true,
	borderRadius: true,
	borderStyle: true,
	borderWidth: true,
	inset: true,
	insetBlock: true,
	insetInline: true,
	marginBlock: true,
	marginInline: true,
	marginHorizontal: true,
	marginVertical: true,
	paddingBlock: true,
	paddingInline: true,
	paddingHorizontal: true,
	paddingVertical: true,
	overflow: true,
	overscrollBehavior: true,
	backgroundPosition: true
};
function error(message) {
	console.error(message);
}
function validate(obj) {
	for (var k in obj) {
		var prop = k.trim();
		var value = obj[prop];
		var isInvalid = false;
		if (value === null) continue;
		if (typeof value === "string" && value.indexOf("!important") > -1) {
			error("Invalid style declaration \"" + prop + ":" + value + "\". Values cannot include \"!important\"");
			isInvalid = true;
		} else {
			var suggestion = "";
			if (prop === "animation" || prop === "animationName") {
				suggestion = "Did you mean \"animationKeyframes\"?";
				isInvalid = true;
			} else if (prop === "direction") {
				suggestion = "Did you mean \"writingDirection\"?";
				isInvalid = true;
			} else if (invalidShortforms[prop]) {
				suggestion = "Please use long-form properties.";
				isInvalid = true;
			} else if (invalidMultiValueShortforms[prop]) {
				if (typeof value === "string" && (0, import_lib.default)(value).nodes.length > 1) {
					suggestion = "Value is \"" + value + "\" but only single values are supported.";
					isInvalid = true;
				}
			}
			if (suggestion !== "") error("Invalid style property of \"" + prop + "\". " + suggestion);
		}
		if (isInvalid) delete obj[k];
	}
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StyleSheet/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$25 = ["writingDirection"];
var staticStyleMap = /* @__PURE__ */ new WeakMap();
var sheet = createSheet();
var defaultPreprocessOptions = {
	shadow: true,
	textShadow: true
};
function customStyleq(styles, options) {
	if (options === void 0) options = {};
	var _options = options, writingDirection = _options.writingDirection, preprocessOptions = _objectWithoutPropertiesLoose(_options, _excluded$25);
	var isRTL = writingDirection === "rtl";
	return import_styleq.styleq.factory({ transform(style) {
		var compiledStyle = staticStyleMap.get(style);
		if (compiledStyle != null) return (0, import_transform_localize_style.localizeStyle)(compiledStyle, isRTL);
		return preprocess(style, _objectSpread2(_objectSpread2({}, defaultPreprocessOptions), preprocessOptions));
	} })(styles);
}
function insertRules(compiledOrderedRules) {
	compiledOrderedRules.forEach((_ref) => {
		var rules = _ref[0], order = _ref[1];
		if (sheet != null) rules.forEach((rule) => {
			sheet.insert(rule, order);
		});
	});
}
function compileAndInsertAtomic(style) {
	var _atomic = atomic(preprocess(style, defaultPreprocessOptions)), compiledStyle = _atomic[0], compiledOrderedRules = _atomic[1];
	insertRules(compiledOrderedRules);
	return compiledStyle;
}
function compileAndInsertReset(style, key) {
	var _classic = classic(style, key), compiledStyle = _classic[0], compiledOrderedRules = _classic[1];
	insertRules(compiledOrderedRules);
	return compiledStyle;
}
var absoluteFillObject = {
	position: "absolute",
	left: 0,
	right: 0,
	top: 0,
	bottom: 0
};
var absoluteFill = create$1({ x: _objectSpread2({}, absoluteFillObject) }).x;
/**
* create
*/
function create$1(styles) {
	Object.keys(styles).forEach((key) => {
		var styleObj = styles[key];
		if (styleObj != null && styleObj.$$css !== true) {
			var compiledStyles;
			if (key.indexOf("$raw") > -1) compiledStyles = compileAndInsertReset(styleObj, key.split("$raw")[0]);
			else {
				validate(styleObj);
				styles[key] = Object.freeze(styleObj);
				compiledStyles = compileAndInsertAtomic(styleObj);
			}
			staticStyleMap.set(styleObj, compiledStyles);
		}
	});
	return styles;
}
/**
* compose
*/
function compose(style1, style2) {
	var len = arguments.length;
	if (len > 2) {
		var readableStyles = [...arguments].map((a) => flatten(a));
		throw new Error("StyleSheet.compose() only accepts 2 arguments, received " + len + ": " + JSON.stringify(readableStyles));
	}
	return [style1, style2];
}
/**
* flatten
*/
function flatten() {
	for (var _len = arguments.length, styles = new Array(_len), _key = 0; _key < _len; _key++) styles[_key] = arguments[_key];
	var flatArray = styles.flat(Infinity);
	var result = {};
	for (var i = 0; i < flatArray.length; i++) {
		var style = flatArray[i];
		if (style != null && typeof style === "object") Object.assign(result, style);
	}
	return result;
}
/**
* getSheet
*/
function getSheet() {
	return {
		id: sheet.id,
		textContent: sheet.getTextContent()
	};
}
/**
* resolve
*/
function StyleSheet(styles, options) {
	if (options === void 0) options = {};
	var isRTL = options.writingDirection === "rtl";
	var styleProps = customStyleq(styles, options);
	if (Array.isArray(styleProps) && styleProps[1] != null) styleProps[1] = inline(styleProps[1], isRTL);
	return styleProps;
}
StyleSheet.absoluteFill = absoluteFill;
StyleSheet.absoluteFillObject = absoluteFillObject;
StyleSheet.create = create$1;
StyleSheet.compose = compose;
StyleSheet.flatten = flatten;
StyleSheet.getSheet = getSheet;
StyleSheet.hairlineWidth = 1;
if (canUseDOM && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) window.__REACT_DEVTOOLS_GLOBAL_HOOK__.resolveRNStyle = StyleSheet.flatten;
var stylesheet = StyleSheet;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/createDOMProps/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$24 = [
	"aria-activedescendant",
	"accessibilityActiveDescendant",
	"aria-atomic",
	"accessibilityAtomic",
	"aria-autocomplete",
	"accessibilityAutoComplete",
	"aria-busy",
	"accessibilityBusy",
	"aria-checked",
	"accessibilityChecked",
	"aria-colcount",
	"accessibilityColumnCount",
	"aria-colindex",
	"accessibilityColumnIndex",
	"aria-colspan",
	"accessibilityColumnSpan",
	"aria-controls",
	"accessibilityControls",
	"aria-current",
	"accessibilityCurrent",
	"aria-describedby",
	"accessibilityDescribedBy",
	"aria-details",
	"accessibilityDetails",
	"aria-disabled",
	"accessibilityDisabled",
	"aria-errormessage",
	"accessibilityErrorMessage",
	"aria-expanded",
	"accessibilityExpanded",
	"aria-flowto",
	"accessibilityFlowTo",
	"aria-haspopup",
	"accessibilityHasPopup",
	"aria-hidden",
	"accessibilityHidden",
	"aria-invalid",
	"accessibilityInvalid",
	"aria-keyshortcuts",
	"accessibilityKeyShortcuts",
	"aria-label",
	"accessibilityLabel",
	"aria-labelledby",
	"accessibilityLabelledBy",
	"aria-level",
	"accessibilityLevel",
	"aria-live",
	"accessibilityLiveRegion",
	"aria-modal",
	"accessibilityModal",
	"aria-multiline",
	"accessibilityMultiline",
	"aria-multiselectable",
	"accessibilityMultiSelectable",
	"aria-orientation",
	"accessibilityOrientation",
	"aria-owns",
	"accessibilityOwns",
	"aria-placeholder",
	"accessibilityPlaceholder",
	"aria-posinset",
	"accessibilityPosInSet",
	"aria-pressed",
	"accessibilityPressed",
	"aria-readonly",
	"accessibilityReadOnly",
	"aria-required",
	"accessibilityRequired",
	"role",
	"accessibilityRole",
	"aria-roledescription",
	"accessibilityRoleDescription",
	"aria-rowcount",
	"accessibilityRowCount",
	"aria-rowindex",
	"accessibilityRowIndex",
	"aria-rowspan",
	"accessibilityRowSpan",
	"aria-selected",
	"accessibilitySelected",
	"aria-setsize",
	"accessibilitySetSize",
	"aria-sort",
	"accessibilitySort",
	"aria-valuemax",
	"accessibilityValueMax",
	"aria-valuemin",
	"accessibilityValueMin",
	"aria-valuenow",
	"accessibilityValueNow",
	"aria-valuetext",
	"accessibilityValueText",
	"dataSet",
	"focusable",
	"id",
	"nativeID",
	"pointerEvents",
	"style",
	"tabIndex",
	"testID"
];
var emptyObject$8 = {};
var hasOwnProperty = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;
var uppercasePattern = /[A-Z]/g;
function toHyphenLower(match) {
	return "-" + match.toLowerCase();
}
function hyphenateString(str) {
	return str.replace(uppercasePattern, toHyphenLower);
}
function processIDRefList(idRefList) {
	return isArray(idRefList) ? idRefList.join(" ") : idRefList;
}
var pointerEventsStyles = stylesheet.create({
	auto: { pointerEvents: "auto" },
	"box-none": { pointerEvents: "box-none" },
	"box-only": { pointerEvents: "box-only" },
	none: { pointerEvents: "none" }
});
var createDOMProps = (elementType, props, options) => {
	if (!props) props = emptyObject$8;
	var _props = props, ariaActiveDescendant = _props["aria-activedescendant"], accessibilityActiveDescendant = _props.accessibilityActiveDescendant, ariaAtomic = _props["aria-atomic"], accessibilityAtomic = _props.accessibilityAtomic, ariaAutoComplete = _props["aria-autocomplete"], accessibilityAutoComplete = _props.accessibilityAutoComplete, ariaBusy = _props["aria-busy"], accessibilityBusy = _props.accessibilityBusy, ariaChecked = _props["aria-checked"], accessibilityChecked = _props.accessibilityChecked, ariaColumnCount = _props["aria-colcount"], accessibilityColumnCount = _props.accessibilityColumnCount, ariaColumnIndex = _props["aria-colindex"], accessibilityColumnIndex = _props.accessibilityColumnIndex, ariaColumnSpan = _props["aria-colspan"], accessibilityColumnSpan = _props.accessibilityColumnSpan, ariaControls = _props["aria-controls"], accessibilityControls = _props.accessibilityControls, ariaCurrent = _props["aria-current"], accessibilityCurrent = _props.accessibilityCurrent, ariaDescribedBy = _props["aria-describedby"], accessibilityDescribedBy = _props.accessibilityDescribedBy, ariaDetails = _props["aria-details"], accessibilityDetails = _props.accessibilityDetails, ariaDisabled = _props["aria-disabled"], accessibilityDisabled = _props.accessibilityDisabled, ariaErrorMessage = _props["aria-errormessage"], accessibilityErrorMessage = _props.accessibilityErrorMessage, ariaExpanded = _props["aria-expanded"], accessibilityExpanded = _props.accessibilityExpanded, ariaFlowTo = _props["aria-flowto"], accessibilityFlowTo = _props.accessibilityFlowTo, ariaHasPopup = _props["aria-haspopup"], accessibilityHasPopup = _props.accessibilityHasPopup, ariaHidden = _props["aria-hidden"], accessibilityHidden = _props.accessibilityHidden, ariaInvalid = _props["aria-invalid"], accessibilityInvalid = _props.accessibilityInvalid, ariaKeyShortcuts = _props["aria-keyshortcuts"], accessibilityKeyShortcuts = _props.accessibilityKeyShortcuts, ariaLabel = _props["aria-label"], accessibilityLabel = _props.accessibilityLabel, ariaLabelledBy = _props["aria-labelledby"], accessibilityLabelledBy = _props.accessibilityLabelledBy, ariaLevel = _props["aria-level"], accessibilityLevel = _props.accessibilityLevel, ariaLive = _props["aria-live"], accessibilityLiveRegion = _props.accessibilityLiveRegion, ariaModal = _props["aria-modal"], accessibilityModal = _props.accessibilityModal, ariaMultiline = _props["aria-multiline"], accessibilityMultiline = _props.accessibilityMultiline, ariaMultiSelectable = _props["aria-multiselectable"], accessibilityMultiSelectable = _props.accessibilityMultiSelectable, ariaOrientation = _props["aria-orientation"], accessibilityOrientation = _props.accessibilityOrientation, ariaOwns = _props["aria-owns"], accessibilityOwns = _props.accessibilityOwns, ariaPlaceholder = _props["aria-placeholder"], accessibilityPlaceholder = _props.accessibilityPlaceholder, ariaPosInSet = _props["aria-posinset"], accessibilityPosInSet = _props.accessibilityPosInSet, ariaPressed = _props["aria-pressed"], accessibilityPressed = _props.accessibilityPressed, ariaReadOnly = _props["aria-readonly"], accessibilityReadOnly = _props.accessibilityReadOnly, ariaRequired = _props["aria-required"], accessibilityRequired = _props.accessibilityRequired;
	_props.role;
	_props.accessibilityRole;
	var ariaRoleDescription = _props["aria-roledescription"], accessibilityRoleDescription = _props.accessibilityRoleDescription, ariaRowCount = _props["aria-rowcount"], accessibilityRowCount = _props.accessibilityRowCount, ariaRowIndex = _props["aria-rowindex"], accessibilityRowIndex = _props.accessibilityRowIndex, ariaRowSpan = _props["aria-rowspan"], accessibilityRowSpan = _props.accessibilityRowSpan, ariaSelected = _props["aria-selected"], accessibilitySelected = _props.accessibilitySelected, ariaSetSize = _props["aria-setsize"], accessibilitySetSize = _props.accessibilitySetSize, ariaSort = _props["aria-sort"], accessibilitySort = _props.accessibilitySort, ariaValueMax = _props["aria-valuemax"], accessibilityValueMax = _props.accessibilityValueMax, ariaValueMin = _props["aria-valuemin"], accessibilityValueMin = _props.accessibilityValueMin, ariaValueNow = _props["aria-valuenow"], accessibilityValueNow = _props.accessibilityValueNow, ariaValueText = _props["aria-valuetext"], accessibilityValueText = _props.accessibilityValueText, dataSet = _props.dataSet, focusable = _props.focusable, id = _props.id, nativeID = _props.nativeID, pointerEvents = _props.pointerEvents, style = _props.style, tabIndex = _props.tabIndex, testID = _props.testID, domProps = _objectWithoutPropertiesLoose(_props, _excluded$24);
	var disabled = ariaDisabled || accessibilityDisabled;
	var role = AccessibilityUtil.propsToAriaRole(props);
	var _ariaActiveDescendant = ariaActiveDescendant != null ? ariaActiveDescendant : accessibilityActiveDescendant;
	if (_ariaActiveDescendant != null) domProps["aria-activedescendant"] = _ariaActiveDescendant;
	var _ariaAtomic = ariaAtomic != null ? ariaActiveDescendant : accessibilityAtomic;
	if (_ariaAtomic != null) domProps["aria-atomic"] = _ariaAtomic;
	var _ariaAutoComplete = ariaAutoComplete != null ? ariaAutoComplete : accessibilityAutoComplete;
	if (_ariaAutoComplete != null) domProps["aria-autocomplete"] = _ariaAutoComplete;
	var _ariaBusy = ariaBusy != null ? ariaBusy : accessibilityBusy;
	if (_ariaBusy != null) domProps["aria-busy"] = _ariaBusy;
	var _ariaChecked = ariaChecked != null ? ariaChecked : accessibilityChecked;
	if (_ariaChecked != null) domProps["aria-checked"] = _ariaChecked;
	var _ariaColumnCount = ariaColumnCount != null ? ariaColumnCount : accessibilityColumnCount;
	if (_ariaColumnCount != null) domProps["aria-colcount"] = _ariaColumnCount;
	var _ariaColumnIndex = ariaColumnIndex != null ? ariaColumnIndex : accessibilityColumnIndex;
	if (_ariaColumnIndex != null) domProps["aria-colindex"] = _ariaColumnIndex;
	var _ariaColumnSpan = ariaColumnSpan != null ? ariaColumnSpan : accessibilityColumnSpan;
	if (_ariaColumnSpan != null) domProps["aria-colspan"] = _ariaColumnSpan;
	var _ariaControls = ariaControls != null ? ariaControls : accessibilityControls;
	if (_ariaControls != null) domProps["aria-controls"] = processIDRefList(_ariaControls);
	var _ariaCurrent = ariaCurrent != null ? ariaCurrent : accessibilityCurrent;
	if (_ariaCurrent != null) domProps["aria-current"] = _ariaCurrent;
	var _ariaDescribedBy = ariaDescribedBy != null ? ariaDescribedBy : accessibilityDescribedBy;
	if (_ariaDescribedBy != null) domProps["aria-describedby"] = processIDRefList(_ariaDescribedBy);
	var _ariaDetails = ariaDetails != null ? ariaDetails : accessibilityDetails;
	if (_ariaDetails != null) domProps["aria-details"] = _ariaDetails;
	if (disabled === true) {
		domProps["aria-disabled"] = true;
		if (elementType === "button" || elementType === "form" || elementType === "input" || elementType === "select" || elementType === "textarea") domProps.disabled = true;
	}
	var _ariaErrorMessage = ariaErrorMessage != null ? ariaErrorMessage : accessibilityErrorMessage;
	if (_ariaErrorMessage != null) domProps["aria-errormessage"] = _ariaErrorMessage;
	var _ariaExpanded = ariaExpanded != null ? ariaExpanded : accessibilityExpanded;
	if (_ariaExpanded != null) domProps["aria-expanded"] = _ariaExpanded;
	var _ariaFlowTo = ariaFlowTo != null ? ariaFlowTo : accessibilityFlowTo;
	if (_ariaFlowTo != null) domProps["aria-flowto"] = processIDRefList(_ariaFlowTo);
	var _ariaHasPopup = ariaHasPopup != null ? ariaHasPopup : accessibilityHasPopup;
	if (_ariaHasPopup != null) domProps["aria-haspopup"] = _ariaHasPopup;
	var _ariaHidden = ariaHidden != null ? ariaHidden : accessibilityHidden;
	if (_ariaHidden === true) domProps["aria-hidden"] = _ariaHidden;
	var _ariaInvalid = ariaInvalid != null ? ariaInvalid : accessibilityInvalid;
	if (_ariaInvalid != null) domProps["aria-invalid"] = _ariaInvalid;
	var _ariaKeyShortcuts = ariaKeyShortcuts != null ? ariaKeyShortcuts : accessibilityKeyShortcuts;
	if (_ariaKeyShortcuts != null) domProps["aria-keyshortcuts"] = processIDRefList(_ariaKeyShortcuts);
	var _ariaLabel = ariaLabel != null ? ariaLabel : accessibilityLabel;
	if (_ariaLabel != null) domProps["aria-label"] = _ariaLabel;
	var _ariaLabelledBy = ariaLabelledBy != null ? ariaLabelledBy : accessibilityLabelledBy;
	if (_ariaLabelledBy != null) domProps["aria-labelledby"] = processIDRefList(_ariaLabelledBy);
	var _ariaLevel = ariaLevel != null ? ariaLevel : accessibilityLevel;
	if (_ariaLevel != null) domProps["aria-level"] = _ariaLevel;
	var _ariaLive = ariaLive != null ? ariaLive : accessibilityLiveRegion;
	if (_ariaLive != null) domProps["aria-live"] = _ariaLive === "none" ? "off" : _ariaLive;
	var _ariaModal = ariaModal != null ? ariaModal : accessibilityModal;
	if (_ariaModal != null) domProps["aria-modal"] = _ariaModal;
	var _ariaMultiline = ariaMultiline != null ? ariaMultiline : accessibilityMultiline;
	if (_ariaMultiline != null) domProps["aria-multiline"] = _ariaMultiline;
	var _ariaMultiSelectable = ariaMultiSelectable != null ? ariaMultiSelectable : accessibilityMultiSelectable;
	if (_ariaMultiSelectable != null) domProps["aria-multiselectable"] = _ariaMultiSelectable;
	var _ariaOrientation = ariaOrientation != null ? ariaOrientation : accessibilityOrientation;
	if (_ariaOrientation != null) domProps["aria-orientation"] = _ariaOrientation;
	var _ariaOwns = ariaOwns != null ? ariaOwns : accessibilityOwns;
	if (_ariaOwns != null) domProps["aria-owns"] = processIDRefList(_ariaOwns);
	var _ariaPlaceholder = ariaPlaceholder != null ? ariaPlaceholder : accessibilityPlaceholder;
	if (_ariaPlaceholder != null) domProps["aria-placeholder"] = _ariaPlaceholder;
	var _ariaPosInSet = ariaPosInSet != null ? ariaPosInSet : accessibilityPosInSet;
	if (_ariaPosInSet != null) domProps["aria-posinset"] = _ariaPosInSet;
	var _ariaPressed = ariaPressed != null ? ariaPressed : accessibilityPressed;
	if (_ariaPressed != null) domProps["aria-pressed"] = _ariaPressed;
	var _ariaReadOnly = ariaReadOnly != null ? ariaReadOnly : accessibilityReadOnly;
	if (_ariaReadOnly != null) {
		domProps["aria-readonly"] = _ariaReadOnly;
		if (elementType === "input" || elementType === "select" || elementType === "textarea") domProps.readOnly = true;
	}
	var _ariaRequired = ariaRequired != null ? ariaRequired : accessibilityRequired;
	if (_ariaRequired != null) {
		domProps["aria-required"] = _ariaRequired;
		if (elementType === "input" || elementType === "select" || elementType === "textarea") domProps.required = accessibilityRequired;
	}
	if (role != null) domProps["role"] = role === "none" ? "presentation" : role;
	var _ariaRoleDescription = ariaRoleDescription != null ? ariaRoleDescription : accessibilityRoleDescription;
	if (_ariaRoleDescription != null) domProps["aria-roledescription"] = _ariaRoleDescription;
	var _ariaRowCount = ariaRowCount != null ? ariaRowCount : accessibilityRowCount;
	if (_ariaRowCount != null) domProps["aria-rowcount"] = _ariaRowCount;
	var _ariaRowIndex = ariaRowIndex != null ? ariaRowIndex : accessibilityRowIndex;
	if (_ariaRowIndex != null) domProps["aria-rowindex"] = _ariaRowIndex;
	var _ariaRowSpan = ariaRowSpan != null ? ariaRowSpan : accessibilityRowSpan;
	if (_ariaRowSpan != null) domProps["aria-rowspan"] = _ariaRowSpan;
	var _ariaSelected = ariaSelected != null ? ariaSelected : accessibilitySelected;
	if (_ariaSelected != null) domProps["aria-selected"] = _ariaSelected;
	var _ariaSetSize = ariaSetSize != null ? ariaSetSize : accessibilitySetSize;
	if (_ariaSetSize != null) domProps["aria-setsize"] = _ariaSetSize;
	var _ariaSort = ariaSort != null ? ariaSort : accessibilitySort;
	if (_ariaSort != null) domProps["aria-sort"] = _ariaSort;
	var _ariaValueMax = ariaValueMax != null ? ariaValueMax : accessibilityValueMax;
	if (_ariaValueMax != null) domProps["aria-valuemax"] = _ariaValueMax;
	var _ariaValueMin = ariaValueMin != null ? ariaValueMin : accessibilityValueMin;
	if (_ariaValueMin != null) domProps["aria-valuemin"] = _ariaValueMin;
	var _ariaValueNow = ariaValueNow != null ? ariaValueNow : accessibilityValueNow;
	if (_ariaValueNow != null) domProps["aria-valuenow"] = _ariaValueNow;
	var _ariaValueText = ariaValueText != null ? ariaValueText : accessibilityValueText;
	if (_ariaValueText != null) domProps["aria-valuetext"] = _ariaValueText;
	if (dataSet != null) {
		for (var dataProp in dataSet) if (hasOwnProperty.call(dataSet, dataProp)) {
			var dataName = hyphenateString(dataProp);
			var dataValue = dataSet[dataProp];
			if (dataValue != null) domProps["data-" + dataName] = dataValue;
		}
	}
	if (tabIndex === 0 || tabIndex === "0" || tabIndex === -1 || tabIndex === "-1") domProps.tabIndex = tabIndex;
	else {
		if (focusable === false) domProps.tabIndex = "-1";
		if (elementType === "a" || elementType === "button" || elementType === "input" || elementType === "select" || elementType === "textarea") {
			if (focusable === false || accessibilityDisabled === true) domProps.tabIndex = "-1";
		} else if (role === "button" || role === "checkbox" || role === "link" || role === "radio" || role === "textbox" || role === "switch") {
			if (focusable !== false) domProps.tabIndex = "0";
		} else if (focusable === true) domProps.tabIndex = "0";
	}
	if (pointerEvents != null) warnOnce("pointerEvents", "props.pointerEvents is deprecated. Use style.pointerEvents");
	var _StyleSheet = stylesheet([style, pointerEvents && pointerEventsStyles[pointerEvents]], _objectSpread2({ writingDirection: "ltr" }, options)), className = _StyleSheet[0], inlineStyle = _StyleSheet[1];
	if (className) domProps.className = className;
	if (inlineStyle) domProps.style = inlineStyle;
	var _id = id != null ? id : nativeID;
	if (_id != null) domProps.id = _id;
	if (testID != null) domProps["data-testid"] = testID;
	if (domProps.type == null && elementType === "button") domProps.type = "button";
	return domProps;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useLocale/isLocaleRTL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var rtlScripts = /* @__PURE__ */ new Set([
	"Arab",
	"Syrc",
	"Samr",
	"Mand",
	"Thaa",
	"Mend",
	"Nkoo",
	"Adlm",
	"Rohg",
	"Hebr"
]);
var rtlLangs = /* @__PURE__ */ new Set([
	"ae",
	"ar",
	"arc",
	"bcc",
	"bqi",
	"ckb",
	"dv",
	"fa",
	"far",
	"glk",
	"he",
	"iw",
	"khw",
	"ks",
	"ku",
	"mzn",
	"nqo",
	"pnb",
	"ps",
	"sd",
	"ug",
	"ur",
	"yi"
]);
var cache = /* @__PURE__ */ new Map();
/**
* Determine the writing direction of a locale
*/
function isLocaleRTL(locale) {
	var cachedRTL = cache.get(locale);
	if (cachedRTL) return cachedRTL;
	var isRTL = false;
	if (Intl.Locale) try {
		var script = new Intl.Locale(locale).maximize().script;
		isRTL = rtlScripts.has(script);
	} catch (_unused) {
		var lang = locale.split("-")[0];
		isRTL = rtlLangs.has(lang);
	}
	else {
		var _lang = locale.split("-")[0];
		isRTL = rtlLangs.has(_lang);
	}
	cache.set(locale, isRTL);
	return isRTL;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useLocale/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var LocaleContext = /*#__PURE__*/ (0, import_react.createContext)({
	direction: "ltr",
	locale: "en-US"
});
function getLocaleDirection(locale) {
	return isLocaleRTL(locale) ? "rtl" : "ltr";
}
function LocaleProvider(props) {
	var direction = props.direction, locale = props.locale, children = props.children;
	return direction || locale ? /*#__PURE__*/ import_react.createElement(LocaleContext.Provider, {
		children,
		value: {
			direction: locale ? getLocaleDirection(locale) : direction,
			locale
		}
	}) : children;
}
function useLocaleContext() {
	return (0, import_react.useContext)(LocaleContext);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/createElement/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var createElement = (component, props, options) => {
	var accessibilityComponent;
	if (component && component.constructor === String) accessibilityComponent = AccessibilityUtil.propsToAccessibilityComponent(props);
	var Component = accessibilityComponent || component;
	var domProps = createDOMProps(Component, props, options);
	var element = /*#__PURE__*/ import_react.createElement(Component, domProps);
	return domProps.dir ? /*#__PURE__*/ import_react.createElement(LocaleProvider, {
		children: element,
		direction: domProps.dir,
		locale: domProps.lang
	}) : element;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/findNodeHandle/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var findNodeHandle = (component) => {
	throw new Error("findNodeHandle is not supported on web. Use the ref property on the component instead.");
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/render/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var import_client = require_client();
function hydrate(element, root) {
	createSheet(root);
	return (0, import_client.hydrateRoot)(root, element);
}
function render(element, root) {
	createSheet(root);
	var reactRoot = (0, import_client.createRoot)(root);
	reactRoot.render(element);
	return reactRoot;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/unmountComponentAtNode/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function unmountComponentAtNode(rootTag) {
	rootTag.unmount();
	return true;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/getBoundingClientRect/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var getBoundingClientRect = (node) => {
	if (node != null) {
		if (node.nodeType === 1 && typeof node.getBoundingClientRect === "function") return node.getBoundingClientRect();
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/unitlessNumbers/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var unitlessNumbers = {
	animationIterationCount: true,
	aspectRatio: true,
	borderImageOutset: true,
	borderImageSlice: true,
	borderImageWidth: true,
	boxFlex: true,
	boxFlexGroup: true,
	boxOrdinalGroup: true,
	columnCount: true,
	flex: true,
	flexGrow: true,
	flexOrder: true,
	flexPositive: true,
	flexShrink: true,
	flexNegative: true,
	fontWeight: true,
	gridRow: true,
	gridRowEnd: true,
	gridRowGap: true,
	gridRowStart: true,
	gridColumn: true,
	gridColumnEnd: true,
	gridColumnGap: true,
	gridColumnStart: true,
	lineClamp: true,
	opacity: true,
	order: true,
	orphans: true,
	tabSize: true,
	widows: true,
	zIndex: true,
	zoom: true,
	fillOpacity: true,
	floodOpacity: true,
	stopOpacity: true,
	strokeDasharray: true,
	strokeDashoffset: true,
	strokeMiterlimit: true,
	strokeOpacity: true,
	strokeWidth: true,
	scale: true,
	scaleX: true,
	scaleY: true,
	scaleZ: true,
	shadowOpacity: true
};
/**
* Support style names that may come passed in prefixed by adding permutations
* of vendor prefixes.
*/
var prefixes = [
	"ms",
	"Moz",
	"O",
	"Webkit"
];
var prefixKey = (prefix, key) => {
	return prefix + key.charAt(0).toUpperCase() + key.substring(1);
};
Object.keys(unitlessNumbers).forEach((prop) => {
	prefixes.forEach((prefix) => {
		unitlessNumbers[prefixKey(prefix, prop)] = unitlessNumbers[prop];
	});
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/setValueForStyles/dangerousStyleValue.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* From React 16.0.0
* 
*/
/**
* Convert a value into the proper css writable value. The style name `name`
* should be logical (no hyphens), as specified
* in `CSSProperty.isUnitlessNumber`.
*
* @param {string} name CSS property name such as `topMargin`.
* @param {*} value CSS property value such as `10px`.
* @return {string} Normalized style value with dimensions applied.
*/
function dangerousStyleValue(name, value, isCustomProperty) {
	if (value == null || typeof value === "boolean" || value === "") return "";
	if (!isCustomProperty && typeof value === "number" && value !== 0 && !(unitlessNumbers.hasOwnProperty(name) && unitlessNumbers[name])) return value + "px";
	return ("" + value).trim();
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/setValueForStyles/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* From React 16.3.0
* 
*/
/**
* Sets the value for multiple styles on a node.  If a value is specified as
* '' (empty string), the corresponding style property will be unset.
*
* @param {DOMElement} node
* @param {object} styles
*/
function setValueForStyles(node, styles) {
	var style = node.style;
	for (var styleName in styles) {
		if (!styles.hasOwnProperty(styleName)) continue;
		var isCustomProperty = styleName.indexOf("--") === 0;
		var styleValue = dangerousStyleValue(styleName, styles[styleName], isCustomProperty);
		if (styleName === "float") styleName = "cssFloat";
		if (isCustomProperty) style.setProperty(styleName, styleValue);
		else style[styleName] = styleValue;
	}
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/UIManager/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var getRect = (node) => {
	var height = node.offsetHeight;
	var width = node.offsetWidth;
	var left = node.offsetLeft;
	var top = node.offsetTop;
	node = node.offsetParent;
	while (node && node.nodeType === 1) {
		left += node.offsetLeft + node.clientLeft - node.scrollLeft;
		top += node.offsetTop + node.clientTop - node.scrollTop;
		node = node.offsetParent;
	}
	top -= window.scrollY;
	left -= window.scrollX;
	return {
		width,
		height,
		top,
		left
	};
};
var measureLayout = (node, relativeToNativeNode, callback) => {
	var relativeNode = relativeToNativeNode || node && node.parentNode;
	if (node && relativeNode) setTimeout(() => {
		if (node.isConnected && relativeNode.isConnected) {
			var relativeRect = getRect(relativeNode);
			var _getRect = getRect(node), height = _getRect.height, left = _getRect.left, top = _getRect.top, width = _getRect.width;
			callback(left - relativeRect.left, top - relativeRect.top, width, height, left, top);
		}
	}, 0);
};
var elementsToIgnore = {
	A: true,
	BODY: true,
	INPUT: true,
	SELECT: true,
	TEXTAREA: true
};
var UIManager = {
	blur(node) {
		try {
			node.blur();
		} catch (err) {}
	},
	focus(node) {
		try {
			var name = node.nodeName;
			if (node.getAttribute("tabIndex") == null && node.isContentEditable !== true && elementsToIgnore[name] == null) node.setAttribute("tabIndex", "-1");
			node.focus();
		} catch (err) {}
	},
	measure(node, callback) {
		measureLayout(node, null, callback);
	},
	measureInWindow(node, callback) {
		if (node) setTimeout(() => {
			var _getBoundingClientRec = getBoundingClientRect(node), height = _getBoundingClientRec.height, left = _getBoundingClientRec.left, top = _getBoundingClientRec.top, width = _getBoundingClientRec.width;
			callback(left, top, width, height);
		}, 0);
	},
	measureLayout(node, relativeToNativeNode, onFail, onSuccess) {
		measureLayout(node, relativeToNativeNode, onSuccess);
	},
	updateView(node, props) {
		for (var prop in props) {
			if (!Object.prototype.hasOwnProperty.call(props, prop)) continue;
			var value = props[prop];
			switch (prop) {
				case "style":
					setValueForStyles(node, value);
					break;
				case "class":
				case "className":
					node.setAttribute("class", value);
					break;
				case "text":
				case "value":
					node.value = value;
					break;
				default: node.setAttribute(prop, value);
			}
		}
	},
	configureNextLayoutAnimation(config, onAnimationDidEnd) {
		onAnimationDidEnd();
	},
	setLayoutAnimationEnabledExperimental() {}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/NativeModules/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var NativeModules = { UIManager };
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/AccessibilityInfo/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function isScreenReaderEnabled() {
	return new Promise((resolve, reject) => {
		resolve(true);
	});
}
var prefersReducedMotionMedia = canUseDOM && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
function isReduceMotionEnabled() {
	return new Promise((resolve, reject) => {
		resolve(prefersReducedMotionMedia ? prefersReducedMotionMedia.matches : true);
	});
}
function addChangeListener(fn) {
	if (prefersReducedMotionMedia != null) prefersReducedMotionMedia.addEventListener != null ? prefersReducedMotionMedia.addEventListener("change", fn) : prefersReducedMotionMedia.addListener(fn);
}
function removeChangeListener(fn) {
	if (prefersReducedMotionMedia != null) prefersReducedMotionMedia.removeEventListener != null ? prefersReducedMotionMedia.removeEventListener("change", fn) : prefersReducedMotionMedia.removeListener(fn);
}
var handlers = {};
var AccessibilityInfo = {
	/**
	* Query whether a screen reader is currently enabled.
	*
	* Returns a promise which resolves to a boolean.
	* The result is `true` when a screen reader is enabled and `false` otherwise.
	*/
	isScreenReaderEnabled,
	/**
	* Query whether the user prefers reduced motion.
	*
	* Returns a promise which resolves to a boolean.
	* The result is `true` when a screen reader is enabled and `false` otherwise.
	*/
	isReduceMotionEnabled,
	/**
	* Deprecated
	*/
	fetch: isScreenReaderEnabled,
	/**
	* Add an event handler. Supported events: reduceMotionChanged
	*/
	addEventListener: function addEventListener(eventName, handler) {
		if (eventName === "reduceMotionChanged") {
			if (!prefersReducedMotionMedia) return;
			var listener = (event) => {
				handler(event.matches);
			};
			addChangeListener(listener);
			handlers[handler] = listener;
		}
		return { remove: () => AccessibilityInfo.removeEventListener(eventName, handler) };
	},
	/**
	* Set accessibility focus to a react component.
	*/
	setAccessibilityFocus: function setAccessibilityFocus(reactTag) {},
	/**
	* Post a string to be announced by the screen reader.
	*/
	announceForAccessibility: function announceForAccessibility(announcement) {},
	/**
	* Remove an event handler.
	*/
	removeEventListener: function removeEventListener(eventName, handler) {
		if (eventName === "reduceMotionChanged") {
			var listener = handlers[handler];
			if (!listener || !prefersReducedMotionMedia) return;
			removeChangeListener(listener);
		}
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Alert/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Alert = class {
	static alert() {}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Platform/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Platform = {
	OS: "web",
	select: (obj) => "web" in obj ? obj.web : obj.default,
	get isTesting() {
		return false;
	},
	get Version() {
		return "0.0.0";
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
	return _extends = Object.assign ? Object.assign.bind() : function(n) {
		for (var e = 1; e < arguments.length; e++) {
			var t = arguments[e];
			for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
		}
		return n;
	}, _extends.apply(null, arguments);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/forwardedProps/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var defaultProps = {
	children: true,
	dataSet: true,
	dir: true,
	id: true,
	ref: true,
	suppressHydrationWarning: true,
	tabIndex: true,
	testID: true,
	focusable: true,
	nativeID: true
};
var accessibilityProps = {
	"aria-activedescendant": true,
	"aria-atomic": true,
	"aria-autocomplete": true,
	"aria-busy": true,
	"aria-checked": true,
	"aria-colcount": true,
	"aria-colindex": true,
	"aria-colspan": true,
	"aria-controls": true,
	"aria-current": true,
	"aria-describedby": true,
	"aria-details": true,
	"aria-disabled": true,
	"aria-errormessage": true,
	"aria-expanded": true,
	"aria-flowto": true,
	"aria-haspopup": true,
	"aria-hidden": true,
	"aria-invalid": true,
	"aria-keyshortcuts": true,
	"aria-label": true,
	"aria-labelledby": true,
	"aria-level": true,
	"aria-live": true,
	"aria-modal": true,
	"aria-multiline": true,
	"aria-multiselectable": true,
	"aria-orientation": true,
	"aria-owns": true,
	"aria-placeholder": true,
	"aria-posinset": true,
	"aria-pressed": true,
	"aria-readonly": true,
	"aria-required": true,
	inert: true,
	role: true,
	"aria-roledescription": true,
	"aria-rowcount": true,
	"aria-rowindex": true,
	"aria-rowspan": true,
	"aria-selected": true,
	"aria-setsize": true,
	"aria-sort": true,
	"aria-valuemax": true,
	"aria-valuemin": true,
	"aria-valuenow": true,
	"aria-valuetext": true,
	accessibilityActiveDescendant: true,
	accessibilityAtomic: true,
	accessibilityAutoComplete: true,
	accessibilityBusy: true,
	accessibilityChecked: true,
	accessibilityColumnCount: true,
	accessibilityColumnIndex: true,
	accessibilityColumnSpan: true,
	accessibilityControls: true,
	accessibilityCurrent: true,
	accessibilityDescribedBy: true,
	accessibilityDetails: true,
	accessibilityDisabled: true,
	accessibilityErrorMessage: true,
	accessibilityExpanded: true,
	accessibilityFlowTo: true,
	accessibilityHasPopup: true,
	accessibilityHidden: true,
	accessibilityInvalid: true,
	accessibilityKeyShortcuts: true,
	accessibilityLabel: true,
	accessibilityLabelledBy: true,
	accessibilityLevel: true,
	accessibilityLiveRegion: true,
	accessibilityModal: true,
	accessibilityMultiline: true,
	accessibilityMultiSelectable: true,
	accessibilityOrientation: true,
	accessibilityOwns: true,
	accessibilityPlaceholder: true,
	accessibilityPosInSet: true,
	accessibilityPressed: true,
	accessibilityReadOnly: true,
	accessibilityRequired: true,
	accessibilityRole: true,
	accessibilityRoleDescription: true,
	accessibilityRowCount: true,
	accessibilityRowIndex: true,
	accessibilityRowSpan: true,
	accessibilitySelected: true,
	accessibilitySetSize: true,
	accessibilitySort: true,
	accessibilityValueMax: true,
	accessibilityValueMin: true,
	accessibilityValueNow: true,
	accessibilityValueText: true
};
var clickProps = {
	onClick: true,
	onAuxClick: true,
	onContextMenu: true,
	onGotPointerCapture: true,
	onLostPointerCapture: true,
	onPointerCancel: true,
	onPointerDown: true,
	onPointerEnter: true,
	onPointerMove: true,
	onPointerLeave: true,
	onPointerOut: true,
	onPointerOver: true,
	onPointerUp: true
};
var focusProps = {
	onBlur: true,
	onFocus: true
};
var keyboardProps = {
	onKeyDown: true,
	onKeyDownCapture: true,
	onKeyUp: true,
	onKeyUpCapture: true
};
var mouseProps = {
	onMouseDown: true,
	onMouseEnter: true,
	onMouseLeave: true,
	onMouseMove: true,
	onMouseOver: true,
	onMouseOut: true,
	onMouseUp: true
};
var touchProps = {
	onTouchCancel: true,
	onTouchCancelCapture: true,
	onTouchEnd: true,
	onTouchEndCapture: true,
	onTouchMove: true,
	onTouchMoveCapture: true,
	onTouchStart: true,
	onTouchStartCapture: true
};
var styleProps = { style: true };
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/pick/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function pick(obj, list) {
	var nextObj = {};
	for (var key in obj) if (obj.hasOwnProperty(key)) {
		if (list[key] === true) nextObj[key] = obj[key];
	}
	return nextObj;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useLayoutEffect/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* useLayoutEffect throws an error on the server. On the few occasions where is
* problematic, use this hook.
*
* 
*/
var useLayoutEffectImpl = canUseDOM ? import_react.useLayoutEffect : import_react.useEffect;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useElementLayout/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var DOM_LAYOUT_HANDLER_NAME = "__reactLayoutHandler";
var didWarn = !canUseDOM;
var resizeObserver = null;
function getResizeObserver() {
	if (canUseDOM && typeof window.ResizeObserver !== "undefined") {
		if (resizeObserver == null) resizeObserver = new window.ResizeObserver(function(entries) {
			entries.forEach((entry) => {
				var node = entry.target;
				var onLayout = node[DOM_LAYOUT_HANDLER_NAME];
				if (typeof onLayout === "function") UIManager.measure(node, (x, y, width, height, left, top) => {
					var event = {
						nativeEvent: { layout: {
							x,
							y,
							width,
							height,
							left,
							top
						} },
						timeStamp: Date.now()
					};
					Object.defineProperty(event.nativeEvent, "target", {
						enumerable: true,
						get: () => entry.target
					});
					onLayout(event);
				});
			});
		});
	} else if (!didWarn) {
		console.warn("onLayout relies on ResizeObserver which is not supported by your browser. Please include a polyfill, e.g., https://github.com/que-etc/resize-observer-polyfill.");
		didWarn = true;
	}
	return resizeObserver;
}
function useElementLayout(ref, onLayout) {
	var observer = getResizeObserver();
	useLayoutEffectImpl(() => {
		var node = ref.current;
		if (node != null) node[DOM_LAYOUT_HANDLER_NAME] = onLayout;
	}, [ref, onLayout]);
	useLayoutEffectImpl(() => {
		var node = ref.current;
		if (node != null && observer != null) {
			if (typeof node[DOM_LAYOUT_HANDLER_NAME] === "function") observer.observe(node);
			else observer.unobserve(node);
		}
		return () => {
			if (node != null && observer != null) observer.unobserve(node);
		};
	}, [ref, observer]);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/mergeRefs/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function mergeRefs() {
	for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
	return function forwardRef(node) {
		args.forEach((ref) => {
			if (ref == null) return;
			if (typeof ref === "function") {
				ref(node);
				return;
			}
			if (typeof ref === "object") {
				ref.current = node;
				return;
			}
			console.error("mergeRefs cannot handle Refs of type boolean, number or string, received ref " + String(ref));
		});
	};
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useMergeRefs/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function useMergeRefs$1() {
	for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
	return import_react.useMemo(() => mergeRefs(...args), [...args]);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useStable/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var UNINITIALIZED = typeof Symbol === "function" && typeof Symbol() === "symbol" ? Symbol() : Object.freeze({});
function useStable$1(getInitialValue) {
	var ref = import_react.useRef(UNINITIALIZED);
	if (ref.current === UNINITIALIZED) ref.current = getInitialValue();
	return ref.current;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/usePlatformMethods/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* Adds non-standard methods to the hode element. This is temporarily until an
* API like `ReactNative.measure(hostRef, callback)` is added to React Native.
*/
function usePlatformMethods(_ref) {
	_ref.pointerEvents;
	_ref.style;
	return useStable$1(() => (hostNode) => {
		if (hostNode != null) {
			hostNode.measure = (callback) => UIManager.measure(hostNode, callback);
			hostNode.measureLayout = (relativeToNode, success, failure) => UIManager.measureLayout(hostNode, relativeToNode, failure, success);
			hostNode.measureInWindow = (callback) => UIManager.measureInWindow(hostNode, callback);
		}
	});
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useResponderEvents/createResponderEvent.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var emptyFunction$3 = () => {};
var emptyObject$7 = {};
var emptyArray = [];
/**
* Safari produces very large identifiers that would cause the `touchBank` array
* length to be so large as to crash the browser, if not normalized like this.
* In the future the `touchBank` should use an object/map instead.
*/
function normalizeIdentifier(identifier) {
	return identifier > 20 ? identifier % 20 : identifier;
}
/**
* Converts a native DOM event to a ResponderEvent.
* Mouse events are transformed into fake touch events.
*/
function createResponderEvent(domEvent, responderTouchHistoryStore) {
	var rect;
	var propagationWasStopped = false;
	var changedTouches;
	var touches;
	var domEventChangedTouches = domEvent.changedTouches;
	var domEventType = domEvent.type;
	var metaKey = domEvent.metaKey === true;
	var shiftKey = domEvent.shiftKey === true;
	var force = domEventChangedTouches && domEventChangedTouches[0].force || 0;
	var identifier = normalizeIdentifier(domEventChangedTouches && domEventChangedTouches[0].identifier || 0);
	var clientX = domEventChangedTouches && domEventChangedTouches[0].clientX || domEvent.clientX;
	var clientY = domEventChangedTouches && domEventChangedTouches[0].clientY || domEvent.clientY;
	var pageX = domEventChangedTouches && domEventChangedTouches[0].pageX || domEvent.pageX;
	var pageY = domEventChangedTouches && domEventChangedTouches[0].pageY || domEvent.pageY;
	var preventDefault = typeof domEvent.preventDefault === "function" ? domEvent.preventDefault.bind(domEvent) : emptyFunction$3;
	var timestamp = domEvent.timeStamp;
	function normalizeTouches(touches) {
		return Array.prototype.slice.call(touches).map((touch) => {
			return {
				force: touch.force,
				identifier: normalizeIdentifier(touch.identifier),
				get locationX() {
					return locationX(touch.clientX);
				},
				get locationY() {
					return locationY(touch.clientY);
				},
				pageX: touch.pageX,
				pageY: touch.pageY,
				target: touch.target,
				timestamp
			};
		});
	}
	if (domEventChangedTouches != null) {
		changedTouches = normalizeTouches(domEventChangedTouches);
		touches = normalizeTouches(domEvent.touches);
	} else {
		var emulatedTouches = [{
			force,
			identifier,
			get locationX() {
				return locationX(clientX);
			},
			get locationY() {
				return locationY(clientY);
			},
			pageX,
			pageY,
			target: domEvent.target,
			timestamp
		}];
		changedTouches = emulatedTouches;
		touches = domEventType === "mouseup" || domEventType === "dragstart" ? emptyArray : emulatedTouches;
	}
	var responderEvent = {
		bubbles: true,
		cancelable: true,
		currentTarget: null,
		defaultPrevented: domEvent.defaultPrevented,
		dispatchConfig: emptyObject$7,
		eventPhase: domEvent.eventPhase,
		isDefaultPrevented() {
			return domEvent.defaultPrevented;
		},
		isPropagationStopped() {
			return propagationWasStopped;
		},
		isTrusted: domEvent.isTrusted,
		nativeEvent: {
			altKey: false,
			ctrlKey: false,
			metaKey,
			shiftKey,
			changedTouches,
			force,
			identifier,
			get locationX() {
				return locationX(clientX);
			},
			get locationY() {
				return locationY(clientY);
			},
			pageX,
			pageY,
			target: domEvent.target,
			timestamp,
			touches,
			type: domEventType
		},
		persist: emptyFunction$3,
		preventDefault,
		stopPropagation() {
			propagationWasStopped = true;
		},
		target: domEvent.target,
		timeStamp: timestamp,
		touchHistory: responderTouchHistoryStore.touchHistory
	};
	function locationX(x) {
		rect = rect || getBoundingClientRect(responderEvent.currentTarget);
		if (rect) return x - rect.left;
	}
	function locationY(y) {
		rect = rect || getBoundingClientRect(responderEvent.currentTarget);
		if (rect) return y - rect.top;
	}
	return responderEvent;
}
var SCROLL$1 = "scroll";
function isStartish(eventType) {
	return eventType === "touchstart" || eventType === "mousedown";
}
function isMoveish(eventType) {
	return eventType === "touchmove" || eventType === "mousemove";
}
function isEndish(eventType) {
	return eventType === "touchend" || eventType === "mouseup" || isCancelish(eventType);
}
function isCancelish(eventType) {
	return eventType === "touchcancel" || eventType === "dragstart";
}
function isScroll(eventType) {
	return eventType === SCROLL$1;
}
function isSelectionChange(eventType) {
	return eventType === "select" || eventType === "selectionchange";
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/isSelectionValid/index.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function isSelectionValid() {
	var selection = window.getSelection();
	var string = selection.toString();
	var anchorNode = selection.anchorNode;
	var focusNode = selection.focusNode;
	var isTextNode = anchorNode && anchorNode.nodeType === window.Node.TEXT_NODE || focusNode && focusNode.nodeType === window.Node.TEXT_NODE;
	return string.length >= 1 && string !== "\n" && isTextNode;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useResponderEvents/utils.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var keyName = "__reactResponderId";
function getEventPath(domEvent) {
	if (domEvent.type === "selectionchange") {
		var target = window.getSelection().anchorNode;
		return composedPathFallback(target);
	} else return domEvent.composedPath != null ? domEvent.composedPath() : composedPathFallback(domEvent.target);
}
function composedPathFallback(target) {
	var path = [];
	while (target != null && target !== document.body) {
		path.push(target);
		target = target.parentNode;
	}
	return path;
}
/**
* Retrieve the responderId from a host node
*/
function getResponderId(node) {
	if (node != null) return node[keyName];
	return null;
}
/**
* Store the responderId on a host node
*/
function setResponderId(node, id) {
	if (node != null) node[keyName] = id;
}
/**
* Filter the event path to contain only the nodes attached to the responder system
*/
function getResponderPaths(domEvent) {
	var idPath = [];
	var nodePath = [];
	var eventPath = getEventPath(domEvent);
	for (var i = 0; i < eventPath.length; i++) {
		var node = eventPath[i];
		var id = getResponderId(node);
		if (id != null) {
			idPath.push(id);
			nodePath.push(node);
		}
	}
	return {
		idPath,
		nodePath
	};
}
/**
* Walk the paths and find the first common ancestor
*/
function getLowestCommonAncestor(pathA, pathB) {
	var pathALength = pathA.length;
	var pathBLength = pathB.length;
	if (pathALength === 0 || pathBLength === 0 || pathA[pathALength - 1] !== pathB[pathBLength - 1]) return null;
	var itemA = pathA[0];
	var indexA = 0;
	var itemB = pathB[0];
	var indexB = 0;
	if (pathALength - pathBLength > 0) {
		indexA = pathALength - pathBLength;
		itemA = pathA[indexA];
		pathALength = pathBLength;
	}
	if (pathBLength - pathALength > 0) {
		indexB = pathBLength - pathALength;
		itemB = pathB[indexB];
		pathBLength = pathALength;
	}
	var depth = pathALength;
	while (depth--) {
		if (itemA === itemB) return itemA;
		itemA = pathA[indexA++];
		itemB = pathB[indexB++];
	}
	return null;
}
/**
* Determine whether any of the active touches are within the current responder.
* This cannot rely on W3C `targetTouches`, as neither IE11 nor Safari implement it.
*/
function hasTargetTouches(target, touches) {
	if (!touches || touches.length === 0) return false;
	for (var i = 0; i < touches.length; i++) {
		var node = touches[i].target;
		if (node != null) {
			if (target.contains(node)) return true;
		}
	}
	return false;
}
/**
* Ignore 'selectionchange' events that don't correspond with a person's intent to
* select text.
*/
function hasValidSelection(domEvent) {
	if (domEvent.type === "selectionchange") return isSelectionValid();
	return domEvent.type === "select";
}
/**
* Events are only valid if the primary button was used without specific modifier keys.
*/
function isPrimaryPointerDown(domEvent) {
	var altKey = domEvent.altKey, button = domEvent.button, buttons = domEvent.buttons, ctrlKey = domEvent.ctrlKey, type = domEvent.type;
	var isTouch = type === "touchstart" || type === "touchmove";
	var isPrimaryMouseDown = type === "mousedown" && (button === 0 || buttons === 1);
	var isPrimaryMouseMove = type === "mousemove" && buttons === 1;
	var noModifiers = altKey === false && ctrlKey === false;
	if (isTouch || isPrimaryMouseDown && noModifiers || isPrimaryMouseMove && noModifiers) return true;
	return false;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useResponderEvents/ResponderTouchHistoryStore.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* Tracks the position and time of each active touch by `touch.identifier`. We
* should typically only see IDs in the range of 1-20 because IDs get recycled
* when touches end and start again.
*/
var __DEV__$4 = true;
var MAX_TOUCH_BANK = 20;
function timestampForTouch(touch) {
	return touch.timeStamp || touch.timestamp;
}
/**
* TODO: Instead of making gestures recompute filtered velocity, we could
* include a built in velocity computation that can be reused globally.
*/
function createTouchRecord(touch) {
	return {
		touchActive: true,
		startPageX: touch.pageX,
		startPageY: touch.pageY,
		startTimeStamp: timestampForTouch(touch),
		currentPageX: touch.pageX,
		currentPageY: touch.pageY,
		currentTimeStamp: timestampForTouch(touch),
		previousPageX: touch.pageX,
		previousPageY: touch.pageY,
		previousTimeStamp: timestampForTouch(touch)
	};
}
function resetTouchRecord(touchRecord, touch) {
	touchRecord.touchActive = true;
	touchRecord.startPageX = touch.pageX;
	touchRecord.startPageY = touch.pageY;
	touchRecord.startTimeStamp = timestampForTouch(touch);
	touchRecord.currentPageX = touch.pageX;
	touchRecord.currentPageY = touch.pageY;
	touchRecord.currentTimeStamp = timestampForTouch(touch);
	touchRecord.previousPageX = touch.pageX;
	touchRecord.previousPageY = touch.pageY;
	touchRecord.previousTimeStamp = timestampForTouch(touch);
}
function getTouchIdentifier(_ref) {
	var identifier = _ref.identifier;
	if (identifier == null) console.error("Touch object is missing identifier.");
	if (__DEV__$4) {
		if (identifier > MAX_TOUCH_BANK) console.error("Touch identifier %s is greater than maximum supported %s which causes performance issues backfilling array locations for all of the indices.", identifier, MAX_TOUCH_BANK);
	}
	return identifier;
}
function recordTouchStart(touch, touchHistory) {
	var identifier = getTouchIdentifier(touch);
	var touchRecord = touchHistory.touchBank[identifier];
	if (touchRecord) resetTouchRecord(touchRecord, touch);
	else touchHistory.touchBank[identifier] = createTouchRecord(touch);
	touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
}
function recordTouchMove(touch, touchHistory) {
	var touchRecord = touchHistory.touchBank[getTouchIdentifier(touch)];
	if (touchRecord) {
		touchRecord.touchActive = true;
		touchRecord.previousPageX = touchRecord.currentPageX;
		touchRecord.previousPageY = touchRecord.currentPageY;
		touchRecord.previousTimeStamp = touchRecord.currentTimeStamp;
		touchRecord.currentPageX = touch.pageX;
		touchRecord.currentPageY = touch.pageY;
		touchRecord.currentTimeStamp = timestampForTouch(touch);
		touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
	} else console.warn("Cannot record touch move without a touch start.\n", "Touch Move: " + printTouch(touch) + "\n", "Touch Bank: " + printTouchBank(touchHistory));
}
function recordTouchEnd(touch, touchHistory) {
	var touchRecord = touchHistory.touchBank[getTouchIdentifier(touch)];
	if (touchRecord) {
		touchRecord.touchActive = false;
		touchRecord.previousPageX = touchRecord.currentPageX;
		touchRecord.previousPageY = touchRecord.currentPageY;
		touchRecord.previousTimeStamp = touchRecord.currentTimeStamp;
		touchRecord.currentPageX = touch.pageX;
		touchRecord.currentPageY = touch.pageY;
		touchRecord.currentTimeStamp = timestampForTouch(touch);
		touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
	} else console.warn("Cannot record touch end without a touch start.\n", "Touch End: " + printTouch(touch) + "\n", "Touch Bank: " + printTouchBank(touchHistory));
}
function printTouch(touch) {
	return JSON.stringify({
		identifier: touch.identifier,
		pageX: touch.pageX,
		pageY: touch.pageY,
		timestamp: timestampForTouch(touch)
	});
}
function printTouchBank(touchHistory) {
	var touchBank = touchHistory.touchBank;
	var printed = JSON.stringify(touchBank.slice(0, MAX_TOUCH_BANK));
	if (touchBank.length > MAX_TOUCH_BANK) printed += " (original size: " + touchBank.length + ")";
	return printed;
}
var ResponderTouchHistoryStore = class {
	constructor() {
		this._touchHistory = {
			touchBank: [],
			numberActiveTouches: 0,
			indexOfSingleActiveTouch: -1,
			mostRecentTimeStamp: 0
		};
	}
	recordTouchTrack(topLevelType, nativeEvent) {
		var touchHistory = this._touchHistory;
		if (isMoveish(topLevelType)) nativeEvent.changedTouches.forEach((touch) => recordTouchMove(touch, touchHistory));
		else if (isStartish(topLevelType)) {
			nativeEvent.changedTouches.forEach((touch) => recordTouchStart(touch, touchHistory));
			touchHistory.numberActiveTouches = nativeEvent.touches.length;
			if (touchHistory.numberActiveTouches === 1) touchHistory.indexOfSingleActiveTouch = nativeEvent.touches[0].identifier;
		} else if (isEndish(topLevelType)) {
			nativeEvent.changedTouches.forEach((touch) => recordTouchEnd(touch, touchHistory));
			touchHistory.numberActiveTouches = nativeEvent.touches.length;
			if (touchHistory.numberActiveTouches === 1) {
				var touchBank = touchHistory.touchBank;
				for (var i = 0; i < touchBank.length; i++) {
					var touchTrackToCheck = touchBank[i];
					if (touchTrackToCheck != null && touchTrackToCheck.touchActive) {
						touchHistory.indexOfSingleActiveTouch = i;
						break;
					}
				}
				if (__DEV__$4) {
					var activeRecord = touchBank[touchHistory.indexOfSingleActiveTouch];
					if (!(activeRecord != null && activeRecord.touchActive)) console.error("Cannot find single active touch.");
				}
			}
		}
	}
	get touchHistory() {
		return this._touchHistory;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useResponderEvents/ResponderSystem.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* RESPONDER EVENT SYSTEM
*
* A single, global "interaction lock" on views. For a view to be the "responder" means
* that pointer interactions are exclusive to that view and none other. The "interaction
* lock" can be transferred (only) to ancestors of the current "responder" as long as
* pointers continue to be active.
*
* Responder being granted:
*
* A view can become the "responder" after the following events:
*  * "pointerdown" (implemented using "touchstart", "mousedown")
*  * "pointermove" (implemented using "touchmove", "mousemove")
*  * "scroll" (while a pointer is down)
*  * "selectionchange" (while a pointer is down)
*
* If nothing is already the "responder", the event propagates to (capture) and from
* (bubble) the event target until a view returns `true` for
* `on*ShouldSetResponder(Capture)`.
*
* If something is already the responder, the event propagates to (capture) and from
* (bubble) the lowest common ancestor of the event target and the current "responder".
* Then negotiation happens between the current "responder" and a view that wants to
* become the "responder": see the timing diagram below.
*
* (NOTE: Scrolled views either automatically become the "responder" or release the
* "interaction lock". A native scroll view that isn't built on top of the responder
* system must result in the current "responder" being notified that it no longer has
* the "interaction lock" - the native system has taken over.
*
* Responder being released:
*
* As soon as there are no more active pointers that *started* inside descendants
* of the *current* "responder", an `onResponderRelease` event is dispatched to the
* current "responder", and the responder lock is released.
*
* Typical sequence of events:
*  * startShouldSetResponder
*  * responderGrant/Reject
*  * responderStart
*  * responderMove
*  * responderEnd
*  * responderRelease
*/
var emptyObject$6 = {};
var startRegistration = [
	"onStartShouldSetResponderCapture",
	"onStartShouldSetResponder",
	{ bubbles: true }
];
var moveRegistration = [
	"onMoveShouldSetResponderCapture",
	"onMoveShouldSetResponder",
	{ bubbles: true }
];
var shouldSetResponderEvents = {
	touchstart: startRegistration,
	mousedown: startRegistration,
	touchmove: moveRegistration,
	mousemove: moveRegistration,
	scroll: [
		"onScrollShouldSetResponderCapture",
		"onScrollShouldSetResponder",
		{ bubbles: false }
	]
};
var emptyResponder = {
	id: null,
	idPath: null,
	node: null
};
var responderListenersMap = /* @__PURE__ */ new Map();
var isEmulatingMouseEvents$1 = false;
var trackedTouchCount = 0;
var currentResponder = {
	id: null,
	node: null,
	idPath: null
};
var responderTouchHistoryStore = new ResponderTouchHistoryStore();
function changeCurrentResponder(responder) {
	currentResponder = responder;
}
function getResponderConfig(id) {
	var config = responderListenersMap.get(id);
	return config != null ? config : emptyObject$6;
}
/**
* Process native events
*
* A single event listener is used to manage the responder system.
* All pointers are tracked in the ResponderTouchHistoryStore. Native events
* are interpreted in terms of the Responder System and checked to see if
* the responder should be transferred. Each host node that is attached to
* the Responder System has an ID, which is used to look up its associated
* callbacks.
*/
function eventListener(domEvent) {
	var eventType = domEvent.type;
	var eventTarget = domEvent.target;
	/**
	* Manage emulated events and early bailout.
	* Since PointerEvent is not used yet (lack of support in older Safari), it's
	* necessary to manually manage the mess of browser touch/mouse events.
	* And bailout early for termination events when there is no active responder.
	*/
	if (eventType === "touchstart") isEmulatingMouseEvents$1 = true;
	if (eventType === "touchmove" || trackedTouchCount > 1) isEmulatingMouseEvents$1 = false;
	if (eventType === "mousedown" && isEmulatingMouseEvents$1 || eventType === "mousemove" && isEmulatingMouseEvents$1 || eventType === "mousemove" && trackedTouchCount < 1) return;
	if (isEmulatingMouseEvents$1 && eventType === "mouseup") {
		if (trackedTouchCount === 0) isEmulatingMouseEvents$1 = false;
		return;
	}
	var isStartEvent = isStartish(eventType) && isPrimaryPointerDown(domEvent);
	var isMoveEvent = isMoveish(eventType);
	var isEndEvent = isEndish(eventType);
	var isScrollEvent = isScroll(eventType);
	var isSelectionChangeEvent = isSelectionChange(eventType);
	var responderEvent = createResponderEvent(domEvent, responderTouchHistoryStore);
	/**
	* Record the state of active pointers
	*/
	if (isStartEvent || isMoveEvent || isEndEvent) {
		if (domEvent.touches) trackedTouchCount = domEvent.touches.length;
		else if (isStartEvent) trackedTouchCount = 1;
		else if (isEndEvent) trackedTouchCount = 0;
		responderTouchHistoryStore.recordTouchTrack(eventType, responderEvent.nativeEvent);
	}
	/**
	* Responder System logic
	*/
	var eventPaths = getResponderPaths(domEvent);
	var wasNegotiated = false;
	var wantsResponder;
	if (isStartEvent || isMoveEvent || isScrollEvent && trackedTouchCount > 0) {
		var currentResponderIdPath = currentResponder.idPath;
		var eventIdPath = eventPaths.idPath;
		if (currentResponderIdPath != null && eventIdPath != null) {
			var lowestCommonAncestor = getLowestCommonAncestor(currentResponderIdPath, eventIdPath);
			if (lowestCommonAncestor != null) {
				var index = eventIdPath.indexOf(lowestCommonAncestor) + (lowestCommonAncestor === currentResponder.id ? 1 : 0);
				eventPaths = {
					idPath: eventIdPath.slice(index),
					nodePath: eventPaths.nodePath.slice(index)
				};
			} else eventPaths = null;
		}
		if (eventPaths != null) {
			wantsResponder = findWantsResponder(eventPaths, domEvent, responderEvent);
			if (wantsResponder != null) {
				attemptTransfer(responderEvent, wantsResponder);
				wasNegotiated = true;
			}
		}
	}
	if (currentResponder.id != null && currentResponder.node != null) {
		var _currentResponder = currentResponder, id = _currentResponder.id, node = _currentResponder.node;
		var _getResponderConfig = getResponderConfig(id), onResponderStart = _getResponderConfig.onResponderStart, onResponderMove = _getResponderConfig.onResponderMove, onResponderEnd = _getResponderConfig.onResponderEnd, onResponderRelease = _getResponderConfig.onResponderRelease, onResponderTerminate = _getResponderConfig.onResponderTerminate, onResponderTerminationRequest = _getResponderConfig.onResponderTerminationRequest;
		responderEvent.bubbles = false;
		responderEvent.cancelable = false;
		responderEvent.currentTarget = node;
		if (isStartEvent) {
			if (onResponderStart != null) {
				responderEvent.dispatchConfig.registrationName = "onResponderStart";
				onResponderStart(responderEvent);
			}
		} else if (isMoveEvent) {
			if (onResponderMove != null) {
				responderEvent.dispatchConfig.registrationName = "onResponderMove";
				onResponderMove(responderEvent);
			}
		} else {
			var isTerminateEvent = isCancelish(eventType) || eventType === "contextmenu" || eventType === "blur" && eventTarget === window || eventType === "blur" && eventTarget.contains(node) && domEvent.relatedTarget !== node || isScrollEvent && trackedTouchCount === 0 || isScrollEvent && eventTarget.contains(node) && eventTarget !== node || isSelectionChangeEvent && hasValidSelection(domEvent);
			var isReleaseEvent = isEndEvent && !isTerminateEvent && !hasTargetTouches(node, domEvent.touches);
			if (isEndEvent) {
				if (onResponderEnd != null) {
					responderEvent.dispatchConfig.registrationName = "onResponderEnd";
					onResponderEnd(responderEvent);
				}
			}
			if (isReleaseEvent) {
				if (onResponderRelease != null) {
					responderEvent.dispatchConfig.registrationName = "onResponderRelease";
					onResponderRelease(responderEvent);
				}
				changeCurrentResponder(emptyResponder);
			}
			if (isTerminateEvent) {
				var shouldTerminate = true;
				if (eventType === "contextmenu" || eventType === "scroll" || eventType === "selectionchange") {
					if (wasNegotiated) shouldTerminate = false;
					else if (onResponderTerminationRequest != null) {
						responderEvent.dispatchConfig.registrationName = "onResponderTerminationRequest";
						if (onResponderTerminationRequest(responderEvent) === false) shouldTerminate = false;
					}
				}
				if (shouldTerminate) {
					if (onResponderTerminate != null) {
						responderEvent.dispatchConfig.registrationName = "onResponderTerminate";
						onResponderTerminate(responderEvent);
					}
					changeCurrentResponder(emptyResponder);
					isEmulatingMouseEvents$1 = false;
					trackedTouchCount = 0;
				}
			}
		}
	}
}
/**
* Walk the event path to/from the target node. At each node, stop and call the
* relevant "shouldSet" functions for the given event type. If any of those functions
* call "stopPropagation" on the event, stop searching for a responder.
*/
function findWantsResponder(eventPaths, domEvent, responderEvent) {
	var shouldSetCallbacks = shouldSetResponderEvents[domEvent.type];
	if (shouldSetCallbacks != null) {
		var idPath = eventPaths.idPath, nodePath = eventPaths.nodePath;
		var shouldSetCallbackCaptureName = shouldSetCallbacks[0];
		var shouldSetCallbackBubbleName = shouldSetCallbacks[1];
		var bubbles = shouldSetCallbacks[2].bubbles;
		var check = function check(id, node, callbackName) {
			var shouldSetCallback = getResponderConfig(id)[callbackName];
			if (shouldSetCallback != null) {
				responderEvent.currentTarget = node;
				if (shouldSetCallback(responderEvent) === true) return {
					id,
					node,
					idPath: idPath.slice(idPath.indexOf(id))
				};
			}
		};
		for (var i = idPath.length - 1; i >= 0; i--) {
			var id = idPath[i];
			var node = nodePath[i];
			var result = check(id, node, shouldSetCallbackCaptureName);
			if (result != null) return result;
			if (responderEvent.isPropagationStopped() === true) return;
		}
		if (bubbles) for (var _i = 0; _i < idPath.length; _i++) {
			var _id = idPath[_i];
			var _node = nodePath[_i];
			var _result = check(_id, _node, shouldSetCallbackBubbleName);
			if (_result != null) return _result;
			if (responderEvent.isPropagationStopped() === true) return;
		}
		else {
			var _id2 = idPath[0];
			var _node2 = nodePath[0];
			if (domEvent.target === _node2) return check(_id2, _node2, shouldSetCallbackBubbleName);
		}
	}
}
/**
* Attempt to transfer the responder.
*/
function attemptTransfer(responderEvent, wantsResponder) {
	var _currentResponder2 = currentResponder, currentId = _currentResponder2.id, currentNode = _currentResponder2.node;
	var id = wantsResponder.id, node = wantsResponder.node;
	var _getResponderConfig2 = getResponderConfig(id), onResponderGrant = _getResponderConfig2.onResponderGrant, onResponderReject = _getResponderConfig2.onResponderReject;
	responderEvent.bubbles = false;
	responderEvent.cancelable = false;
	responderEvent.currentTarget = node;
	if (currentId == null) {
		if (onResponderGrant != null) {
			responderEvent.currentTarget = node;
			responderEvent.dispatchConfig.registrationName = "onResponderGrant";
			onResponderGrant(responderEvent);
		}
		changeCurrentResponder(wantsResponder);
	} else {
		var _getResponderConfig3 = getResponderConfig(currentId), onResponderTerminate = _getResponderConfig3.onResponderTerminate, onResponderTerminationRequest = _getResponderConfig3.onResponderTerminationRequest;
		var allowTransfer = true;
		if (onResponderTerminationRequest != null) {
			responderEvent.currentTarget = currentNode;
			responderEvent.dispatchConfig.registrationName = "onResponderTerminationRequest";
			if (onResponderTerminationRequest(responderEvent) === false) allowTransfer = false;
		}
		if (allowTransfer) {
			if (onResponderTerminate != null) {
				responderEvent.currentTarget = currentNode;
				responderEvent.dispatchConfig.registrationName = "onResponderTerminate";
				onResponderTerminate(responderEvent);
			}
			if (onResponderGrant != null) {
				responderEvent.currentTarget = node;
				responderEvent.dispatchConfig.registrationName = "onResponderGrant";
				onResponderGrant(responderEvent);
			}
			changeCurrentResponder(wantsResponder);
		} else if (onResponderReject != null) {
			responderEvent.currentTarget = node;
			responderEvent.dispatchConfig.registrationName = "onResponderReject";
			onResponderReject(responderEvent);
		}
	}
}
/**
* Attach Listeners
*
* Use native events as ReactDOM doesn't have a non-plugin API to implement
* this system.
*/
var documentEventsCapturePhase = ["blur", "scroll"];
var documentEventsBubblePhase = [
	"mousedown",
	"mousemove",
	"mouseup",
	"dragstart",
	"touchstart",
	"touchmove",
	"touchend",
	"touchcancel",
	"contextmenu",
	"select",
	"selectionchange"
];
function attachListeners() {
	if (canUseDOM && window.__reactResponderSystemActive == null) {
		window.addEventListener("blur", eventListener);
		documentEventsBubblePhase.forEach((eventType) => {
			document.addEventListener(eventType, eventListener);
		});
		documentEventsCapturePhase.forEach((eventType) => {
			document.addEventListener(eventType, eventListener, true);
		});
		window.__reactResponderSystemActive = true;
	}
}
/**
* Register a node with the ResponderSystem.
*/
function addNode(id, node, config) {
	setResponderId(node, id);
	responderListenersMap.set(id, config);
}
/**
* Unregister a node with the ResponderSystem.
*/
function removeNode(id) {
	if (currentResponder.id === id) terminateResponder();
	if (responderListenersMap.has(id)) responderListenersMap.delete(id);
}
/**
* Allow the current responder to be terminated from within components to support
* more complex requirements, such as use with other React libraries for working
* with scroll views, input views, etc.
*/
function terminateResponder() {
	var _currentResponder3 = currentResponder, id = _currentResponder3.id, node = _currentResponder3.node;
	if (id != null && node != null) {
		var onResponderTerminate = getResponderConfig(id).onResponderTerminate;
		if (onResponderTerminate != null) {
			var event = createResponderEvent({}, responderTouchHistoryStore);
			event.currentTarget = node;
			onResponderTerminate(event);
		}
		changeCurrentResponder(emptyResponder);
	}
	isEmulatingMouseEvents$1 = false;
	trackedTouchCount = 0;
}
/**
* Allow unit tests to inspect the current responder in the system.
* FOR TESTING ONLY.
*/
function getResponderNode() {
	return currentResponder.node;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useResponderEvents/index.js
/**
* Copyright (c) Nicolas Gallagher
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* Hook for integrating the Responder System into React
*
*   function SomeComponent({ onStartShouldSetResponder }) {
*     const ref = useRef(null);
*     useResponderEvents(ref, { onStartShouldSetResponder });
*     return <div ref={ref} />
*   }
*/
var emptyObject$5 = {};
var idCounter = 0;
function useStable(getInitialValue) {
	var ref = import_react.useRef(null);
	if (ref.current == null) ref.current = getInitialValue();
	return ref.current;
}
function useResponderEvents(hostRef, config) {
	if (config === void 0) config = emptyObject$5;
	var id = useStable(() => idCounter++);
	var isAttachedRef = import_react.useRef(false);
	import_react.useEffect(() => {
		attachListeners();
		return () => {
			removeNode(id);
		};
	}, [id]);
	import_react.useEffect(() => {
		var _config = config, onMoveShouldSetResponder = _config.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = _config.onMoveShouldSetResponderCapture, onScrollShouldSetResponder = _config.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = _config.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = _config.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = _config.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = _config.onStartShouldSetResponder, onStartShouldSetResponderCapture = _config.onStartShouldSetResponderCapture;
		var requiresResponderSystem = onMoveShouldSetResponder != null || onMoveShouldSetResponderCapture != null || onScrollShouldSetResponder != null || onScrollShouldSetResponderCapture != null || onSelectionChangeShouldSetResponder != null || onSelectionChangeShouldSetResponderCapture != null || onStartShouldSetResponder != null || onStartShouldSetResponderCapture != null;
		var node = hostRef.current;
		if (requiresResponderSystem) {
			addNode(id, node, config);
			isAttachedRef.current = true;
		} else if (isAttachedRef.current) {
			removeNode(id);
			isAttachedRef.current = false;
		}
	}, [
		config,
		hostRef,
		id
	]);
	import_react.useDebugValue({ isResponder: hostRef.current === getResponderNode() });
	import_react.useDebugValue(config);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Text/TextAncestorContext.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var TextAncestorContext = /*#__PURE__*/ (0, import_react.createContext)(false);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/View/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$23 = [
	"hrefAttrs",
	"onLayout",
	"onMoveShouldSetResponder",
	"onMoveShouldSetResponderCapture",
	"onResponderEnd",
	"onResponderGrant",
	"onResponderMove",
	"onResponderReject",
	"onResponderRelease",
	"onResponderStart",
	"onResponderTerminate",
	"onResponderTerminationRequest",
	"onScrollShouldSetResponder",
	"onScrollShouldSetResponderCapture",
	"onSelectionChangeShouldSetResponder",
	"onSelectionChangeShouldSetResponderCapture",
	"onStartShouldSetResponder",
	"onStartShouldSetResponderCapture"
];
var forwardPropsList$3 = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
	href: true,
	lang: true,
	onScroll: true,
	onWheel: true,
	pointerEvents: true
});
var pickProps$3 = (props) => pick(props, forwardPropsList$3);
var View = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var hrefAttrs = props.hrefAttrs, onLayout = props.onLayout, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, rest = _objectWithoutPropertiesLoose(props, _excluded$23);
	import_react.Children.toArray(props.children).forEach((item) => {
		if (typeof item === "string") console.error("Unexpected text node: " + item + ". A text node cannot be a child of a <View>.");
	});
	var hasTextAncestor = import_react.useContext(TextAncestorContext);
	var hostRef = import_react.useRef(null);
	var contextDirection = useLocaleContext().direction;
	useElementLayout(hostRef, onLayout);
	useResponderEvents(hostRef, {
		onMoveShouldSetResponder,
		onMoveShouldSetResponderCapture,
		onResponderEnd,
		onResponderGrant,
		onResponderMove,
		onResponderReject,
		onResponderRelease,
		onResponderStart,
		onResponderTerminate,
		onResponderTerminationRequest,
		onScrollShouldSetResponder,
		onScrollShouldSetResponderCapture,
		onSelectionChangeShouldSetResponder,
		onSelectionChangeShouldSetResponderCapture,
		onStartShouldSetResponder,
		onStartShouldSetResponderCapture
	});
	var component = "div";
	var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
	var componentDirection = props.dir || langDirection;
	var writingDirection = componentDirection || contextDirection;
	var supportedProps = pickProps$3(rest);
	supportedProps.dir = componentDirection;
	supportedProps.style = [
		styles$22.view$raw,
		hasTextAncestor && styles$22.inline,
		props.style
	];
	if (props.href != null) {
		component = "a";
		if (hrefAttrs != null) {
			var download = hrefAttrs.download, rel = hrefAttrs.rel, target = hrefAttrs.target;
			if (download != null) supportedProps.download = download;
			if (rel != null) supportedProps.rel = rel;
			if (typeof target === "string") supportedProps.target = target.charAt(0) !== "_" ? "_" + target : target;
		}
	}
	supportedProps.ref = useMergeRefs$1(hostRef, usePlatformMethods(supportedProps), forwardedRef);
	return createElement(component, supportedProps, { writingDirection });
});
View.displayName = "View";
var styles$22 = stylesheet.create({
	view$raw: {
		alignContent: "flex-start",
		alignItems: "stretch",
		backgroundColor: "transparent",
		border: "0 solid black",
		boxSizing: "border-box",
		display: "flex",
		flexBasis: "auto",
		flexDirection: "column",
		flexShrink: 0,
		listStyle: "none",
		margin: 0,
		minHeight: 0,
		minWidth: 0,
		padding: 0,
		position: "relative",
		textDecoration: "none",
		zIndex: 0
	},
	inline: { display: "inline-flex" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/deepDiffer/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
var deepDiffer = function deepDiffer(one, two, maxDepth) {
	if (maxDepth === void 0) maxDepth = -1;
	if (maxDepth === 0) return true;
	if (one === two) return false;
	if (typeof one === "function" && typeof two === "function") return false;
	if (typeof one !== "object" || one === null) return one !== two;
	if (typeof two !== "object" || two === null) return true;
	if (one.constructor !== two.constructor) return true;
	if (Array.isArray(one)) {
		var len = one.length;
		if (two.length !== len) return true;
		for (var ii = 0; ii < len; ii++) if (deepDiffer(one[ii], two[ii], maxDepth - 1)) return true;
	} else {
		for (var key in one) if (deepDiffer(one[key], two[key], maxDepth - 1)) return true;
		for (var twoKey in two) if (one[twoKey] === void 0 && two[twoKey] !== void 0) return true;
	}
	return false;
};
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/arrayLikeToArray.js
var import_invariant = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var validateFormat = function(format) {
		if (format === void 0) throw new Error("invariant(...): Second argument must be a string.");
	};
	/**
	* Use invariant() to assert state which your program assumes to be true.
	*
	* Provide sprintf-style format (only %s is supported) and arguments to provide
	* information about what broke and what you were expecting.
	*
	* The invariant message will be stripped in production, but the invariant will
	* remain to ensure logic does not differ in production.
	*/
	function invariant(condition, format) {
		for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
		validateFormat(format);
		if (!condition) {
			var error;
			if (format === void 0) error = /* @__PURE__ */ new Error("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.");
			else {
				var argIndex = 0;
				error = new Error(format.replace(/%s/g, function() {
					return String(args[argIndex++]);
				}));
				error.name = "Invariant Violation";
			}
			error.framesToPop = 1;
			throw error;
		}
	}
	module.exports = invariant;
})))());
function _arrayLikeToArray(r, a) {
	(null == a || a > r.length) && (a = r.length);
	for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
	return n;
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/unsupportedIterableToArray.js
function _unsupportedIterableToArray(r, a) {
	if (r) {
		if ("string" == typeof r) return _arrayLikeToArray(r, a);
		var t = {}.toString.call(r).slice(8, -1);
		return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
	}
}
//#endregion
//#region ../../../../node_modules/.pnpm/@babel+runtime@7.29.7/node_modules/@babel/runtime/helpers/esm/createForOfIteratorHelperLoose.js
function _createForOfIteratorHelperLoose(r, e) {
	var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
	if (t) return (t = t.call(r)).next.bind(t);
	if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
		t && (r = t);
		var o = 0;
		return function() {
			return o >= r.length ? { done: !0 } : {
				done: !1,
				value: r[o++]
			};
		};
	}
	throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/RefreshControl/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$22 = [
	"colors",
	"enabled",
	"onRefresh",
	"progressBackgroundColor",
	"progressViewOffset",
	"refreshing",
	"size",
	"tintColor",
	"title",
	"titleColor"
];
function RefreshControl(props) {
	props.colors;
	props.enabled;
	props.onRefresh;
	props.progressBackgroundColor;
	props.progressViewOffset;
	props.refreshing;
	props.size;
	props.tintColor;
	props.title;
	props.titleColor;
	var rest = _objectWithoutPropertiesLoose(props, _excluded$22);
	return /*#__PURE__*/ import_react.createElement(View, rest);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Dimensions/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var dimensions = {
	window: {
		fontScale: 1,
		height: 0,
		scale: 1,
		width: 0
	},
	screen: {
		fontScale: 1,
		height: 0,
		scale: 1,
		width: 0
	}
};
var listeners$1 = {};
var shouldInit = canUseDOM;
function update() {
	if (!canUseDOM) return;
	var win = window;
	var height;
	var width;
	/**
	* iOS does not update viewport dimensions on keyboard open/close.
	* window.visualViewport(https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
	* is used instead of document.documentElement.clientHeight (which remains as a fallback)
	*/
	if (win.visualViewport) {
		var visualViewport = win.visualViewport;
		/**
		* We are multiplying by scale because height and width from visual viewport
		* also react to pinch zoom, and become smaller when zoomed. But it is not desired
		* behaviour, since originally documentElement client height and width were used,
		* and they do not react to pinch zoom.
		*/
		height = Math.round(visualViewport.height * visualViewport.scale);
		width = Math.round(visualViewport.width * visualViewport.scale);
	} else {
		var docEl = win.document.documentElement;
		height = docEl.clientHeight;
		width = docEl.clientWidth;
	}
	dimensions.window = {
		fontScale: 1,
		height,
		scale: win.devicePixelRatio || 1,
		width
	};
	dimensions.screen = {
		fontScale: 1,
		height: win.screen.height,
		scale: win.devicePixelRatio || 1,
		width: win.screen.width
	};
}
function handleResize() {
	update();
	if (Array.isArray(listeners$1["change"])) listeners$1["change"].forEach((handler) => handler(dimensions));
}
var Dimensions = class {
	static get(dimension) {
		if (shouldInit) {
			shouldInit = false;
			update();
		}
		(0, import_invariant.default)(dimensions[dimension], "No dimension set for key " + dimension);
		return dimensions[dimension];
	}
	static set(initialDimensions) {
		if (initialDimensions) {
			if (canUseDOM) (0, import_invariant.default)(false, "Dimensions cannot be set in the browser");
			else {
				if (initialDimensions.screen != null) dimensions.screen = initialDimensions.screen;
				if (initialDimensions.window != null) dimensions.window = initialDimensions.window;
			}
		}
	}
	static addEventListener(type, handler) {
		listeners$1[type] = listeners$1[type] || [];
		listeners$1[type].push(handler);
		return { remove: () => {
			this.removeEventListener(type, handler);
		} };
	}
	static removeEventListener(type, handler) {
		if (Array.isArray(listeners$1[type])) listeners$1[type] = listeners$1[type].filter((_handler) => _handler !== handler);
	}
};
if (canUseDOM) {
	if (window.visualViewport) window.visualViewport.addEventListener("resize", handleResize, false);
	else window.addEventListener("resize", handleResize, false);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/TextInputState/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* This class is responsible for coordinating the "focused"
* state for TextInputs. All calls relating to the keyboard
* should be funneled through here
*/
var TextInputState = {
	/**
	* Internal state
	*/
	_currentlyFocusedNode: null,
	/**
	* Returns the ID of the currently focused text field, if one exists
	* If no text field is focused it returns null
	*/
	currentlyFocusedField() {
		if (document.activeElement !== this._currentlyFocusedNode) this._currentlyFocusedNode = null;
		return this._currentlyFocusedNode;
	},
	/**
	* @param {Object} TextInputID id of the text field to focus
	* Focuses the specified text field
	* noop if the text field was already focused
	*/
	focusTextInput(textFieldNode) {
		if (textFieldNode !== null) {
			this._currentlyFocusedNode = textFieldNode;
			if (document.activeElement !== textFieldNode) UIManager.focus(textFieldNode);
		}
	},
	/**
	* @param {Object} textFieldNode id of the text field to focus
	* Unfocuses the specified text field
	* noop if it wasn't focused
	*/
	blurTextInput(textFieldNode) {
		if (textFieldNode !== null) {
			this._currentlyFocusedNode = null;
			if (document.activeElement === textFieldNode) UIManager.blur(textFieldNode);
		}
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/dismissKeyboard/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var dismissKeyboard = () => {
	TextInputState.blurTextInput(TextInputState.currentlyFocusedField());
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/ScrollView/ScrollViewBase.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$21 = [
	"onScroll",
	"onTouchMove",
	"onWheel",
	"scrollEnabled",
	"scrollEventThrottle",
	"showsHorizontalScrollIndicator",
	"showsVerticalScrollIndicator",
	"style"
];
function normalizeScrollEvent(e) {
	return {
		nativeEvent: {
			contentOffset: {
				get x() {
					return e.target.scrollLeft;
				},
				get y() {
					return e.target.scrollTop;
				}
			},
			contentSize: {
				get height() {
					return e.target.scrollHeight;
				},
				get width() {
					return e.target.scrollWidth;
				}
			},
			layoutMeasurement: {
				get height() {
					return e.target.offsetHeight;
				},
				get width() {
					return e.target.offsetWidth;
				}
			}
		},
		timeStamp: Date.now()
	};
}
function shouldEmitScrollEvent(lastTick, eventThrottle) {
	var timeSinceLastTick = Date.now() - lastTick;
	return eventThrottle > 0 && timeSinceLastTick >= eventThrottle;
}
/**
* Encapsulates the Web-specific scroll throttling and disabling logic
*/
var ScrollViewBase = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var onScroll = props.onScroll, onTouchMove = props.onTouchMove, onWheel = props.onWheel, _props$scrollEnabled = props.scrollEnabled, scrollEnabled = _props$scrollEnabled === void 0 ? true : _props$scrollEnabled, _props$scrollEventThr = props.scrollEventThrottle, scrollEventThrottle = _props$scrollEventThr === void 0 ? 0 : _props$scrollEventThr, showsHorizontalScrollIndicator = props.showsHorizontalScrollIndicator, showsVerticalScrollIndicator = props.showsVerticalScrollIndicator, style = props.style, rest = _objectWithoutPropertiesLoose(props, _excluded$21);
	var scrollState = import_react.useRef({
		isScrolling: false,
		scrollLastTick: 0
	});
	var scrollTimeout = import_react.useRef(null);
	var scrollRef = import_react.useRef(null);
	function createPreventableScrollHandler(handler) {
		return (e) => {
			if (scrollEnabled) {
				if (handler) handler(e);
			}
		};
	}
	function handleScroll(e) {
		e.stopPropagation();
		if (e.target === scrollRef.current) {
			e.persist();
			if (scrollTimeout.current != null) clearTimeout(scrollTimeout.current);
			scrollTimeout.current = setTimeout(() => {
				handleScrollEnd(e);
			}, 100);
			if (scrollState.current.isScrolling) {
				if (shouldEmitScrollEvent(scrollState.current.scrollLastTick, scrollEventThrottle)) handleScrollTick(e);
			} else handleScrollStart(e);
		}
	}
	function handleScrollStart(e) {
		scrollState.current.isScrolling = true;
		handleScrollTick(e);
	}
	function handleScrollTick(e) {
		scrollState.current.scrollLastTick = Date.now();
		if (onScroll) onScroll(normalizeScrollEvent(e));
	}
	function handleScrollEnd(e) {
		scrollState.current.isScrolling = false;
		if (onScroll) onScroll(normalizeScrollEvent(e));
	}
	var hideScrollbar = showsHorizontalScrollIndicator === false || showsVerticalScrollIndicator === false;
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, {
		onScroll: handleScroll,
		onTouchMove: createPreventableScrollHandler(onTouchMove),
		onWheel: createPreventableScrollHandler(onWheel),
		ref: useMergeRefs$1(scrollRef, forwardedRef),
		style: [
			style,
			!scrollEnabled && styles$21.scrollDisabled,
			hideScrollbar && styles$21.hideScrollbar
		]
	}));
});
var styles$21 = stylesheet.create({
	scrollDisabled: {
		overflowX: "hidden",
		overflowY: "hidden",
		touchAction: "none"
	},
	hideScrollbar: { scrollbarWidth: "none" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/fbjs@3.0.5/node_modules/fbjs/lib/emptyFunction.js
var require_emptyFunction = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Copyright (c) 2013-present, Facebook, Inc.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*
	* 
	*/
	function makeEmptyFunction(arg) {
		return function() {
			return arg;
		};
	}
	/**
	* This function accepts and discards inputs; it has no side effects. This is
	* primarily useful idiomatically for overridable function endpoints which
	* always need to be callable, since JS lacks a null-call idiom ala Cocoa.
	*/
	var emptyFunction = function emptyFunction() {};
	emptyFunction.thatReturns = makeEmptyFunction;
	emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
	emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
	emptyFunction.thatReturnsNull = makeEmptyFunction(null);
	emptyFunction.thatReturnsThis = function() {
		return this;
	};
	emptyFunction.thatReturnsArgument = function(arg) {
		return arg;
	};
	module.exports = emptyFunction;
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/ScrollView/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var import_warning = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	require_emptyFunction();
	/**
	* Similar to invariant but only logs a warning if the condition is not met.
	* This can be used to log issues in development environments in critical
	* paths. Removing the logging code for production environments will keep the
	* same logic and follow the same code paths.
	*/
	function printWarning(format) {
		for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
		var argIndex = 0;
		var message = "Warning: " + format.replace(/%s/g, function() {
			return args[argIndex++];
		});
		if (typeof console !== "undefined") console.error(message);
		try {
			throw new Error(message);
		} catch (x) {}
	}
	var warning = function(condition, format) {
		if (format === void 0) throw new Error("`warning(condition, format, ...args)` requires a warning message argument");
		if (!condition) {
			for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) args[_key2 - 2] = arguments[_key2];
			printWarning.apply(void 0, [format].concat(args));
		}
	};
	module.exports = warning;
})))());
var _excluded$20 = [
	"contentContainerStyle",
	"horizontal",
	"onContentSizeChange",
	"refreshControl",
	"stickyHeaderIndices",
	"pagingEnabled",
	"forwardedRef",
	"keyboardDismissMode",
	"onScroll",
	"centerContent"
];
var emptyObject$4 = {};
var IS_ANIMATING_TOUCH_START_THRESHOLD_MS = 16;
var ScrollView = class extends import_react.Component {
	constructor() {
		super(...arguments);
		this._scrollNodeRef = null;
		this._innerViewRef = null;
		this.isTouching = false;
		this.lastMomentumScrollBeginTime = 0;
		this.lastMomentumScrollEndTime = 0;
		this.observedScrollSinceBecomingResponder = false;
		this.becameResponderWhileAnimating = false;
		this.scrollResponderHandleScrollShouldSetResponder = () => {
			return this.isTouching;
		};
		this.scrollResponderHandleStartShouldSetResponderCapture = (e) => {
			return this.scrollResponderIsAnimating();
		};
		this.scrollResponderHandleTerminationRequest = () => {
			return !this.observedScrollSinceBecomingResponder;
		};
		this.scrollResponderHandleTouchEnd = (e) => {
			var nativeEvent = e.nativeEvent;
			this.isTouching = nativeEvent.touches.length !== 0;
			this.props.onTouchEnd && this.props.onTouchEnd(e);
		};
		this.scrollResponderHandleResponderRelease = (e) => {
			this.props.onResponderRelease && this.props.onResponderRelease(e);
			var currentlyFocusedTextInput = TextInputState.currentlyFocusedField();
			if (!this.props.keyboardShouldPersistTaps && currentlyFocusedTextInput != null && e.target !== currentlyFocusedTextInput && !this.observedScrollSinceBecomingResponder && !this.becameResponderWhileAnimating) {
				this.props.onScrollResponderKeyboardDismissed && this.props.onScrollResponderKeyboardDismissed(e);
				TextInputState.blurTextInput(currentlyFocusedTextInput);
			}
		};
		this.scrollResponderHandleScroll = (e) => {
			this.observedScrollSinceBecomingResponder = true;
			this.props.onScroll && this.props.onScroll(e);
		};
		this.scrollResponderHandleResponderGrant = (e) => {
			this.observedScrollSinceBecomingResponder = false;
			this.props.onResponderGrant && this.props.onResponderGrant(e);
			this.becameResponderWhileAnimating = this.scrollResponderIsAnimating();
		};
		this.scrollResponderHandleScrollBeginDrag = (e) => {
			this.props.onScrollBeginDrag && this.props.onScrollBeginDrag(e);
		};
		this.scrollResponderHandleScrollEndDrag = (e) => {
			this.props.onScrollEndDrag && this.props.onScrollEndDrag(e);
		};
		this.scrollResponderHandleMomentumScrollBegin = (e) => {
			this.lastMomentumScrollBeginTime = Date.now();
			this.props.onMomentumScrollBegin && this.props.onMomentumScrollBegin(e);
		};
		this.scrollResponderHandleMomentumScrollEnd = (e) => {
			this.lastMomentumScrollEndTime = Date.now();
			this.props.onMomentumScrollEnd && this.props.onMomentumScrollEnd(e);
		};
		this.scrollResponderHandleTouchStart = (e) => {
			this.isTouching = true;
			this.props.onTouchStart && this.props.onTouchStart(e);
		};
		this.scrollResponderHandleTouchMove = (e) => {
			this.props.onTouchMove && this.props.onTouchMove(e);
		};
		this.scrollResponderIsAnimating = () => {
			return Date.now() - this.lastMomentumScrollEndTime < IS_ANIMATING_TOUCH_START_THRESHOLD_MS || this.lastMomentumScrollEndTime < this.lastMomentumScrollBeginTime;
		};
		this.scrollResponderScrollTo = (x, y, animated) => {
			if (typeof x === "number") console.warn("`scrollResponderScrollTo(x, y, animated)` is deprecated. Use `scrollResponderScrollTo({x: 5, y: 5, animated: true})` instead.");
			else {
				var _ref = x || emptyObject$4;
				x = _ref.x;
				y = _ref.y;
				animated = _ref.animated;
			}
			var node = this.getScrollableNode();
			var left = x || 0;
			var top = y || 0;
			if (node != null) {
				if (typeof node.scroll === "function") node.scroll({
					top,
					left,
					behavior: !animated ? "auto" : "smooth"
				});
				else {
					node.scrollLeft = left;
					node.scrollTop = top;
				}
			}
		};
		this.scrollResponderZoomTo = (rect, animated) => {
			if (Platform.OS !== "ios") (0, import_invariant.default)("zoomToRect is not implemented");
		};
		this.scrollResponderScrollNativeHandleToKeyboard = (nodeHandle, additionalOffset, preventNegativeScrollOffset) => {
			this.additionalScrollOffset = additionalOffset || 0;
			this.preventNegativeScrollOffset = !!preventNegativeScrollOffset;
			UIManager.measureLayout(nodeHandle, this.getInnerViewNode(), this.scrollResponderTextInputFocusError, this.scrollResponderInputMeasureAndScrollToKeyboard);
		};
		this.scrollResponderInputMeasureAndScrollToKeyboard = (left, top, width, height) => {
			var keyboardScreenY = Dimensions.get("window").height;
			if (this.keyboardWillOpenTo) keyboardScreenY = this.keyboardWillOpenTo.endCoordinates.screenY;
			var scrollOffsetY = top - keyboardScreenY + height + this.additionalScrollOffset;
			if (this.preventNegativeScrollOffset) scrollOffsetY = Math.max(0, scrollOffsetY);
			this.scrollResponderScrollTo({
				x: 0,
				y: scrollOffsetY,
				animated: true
			});
			this.additionalOffset = 0;
			this.preventNegativeScrollOffset = false;
		};
		this.scrollResponderKeyboardWillShow = (e) => {
			this.keyboardWillOpenTo = e;
			this.props.onKeyboardWillShow && this.props.onKeyboardWillShow(e);
		};
		this.scrollResponderKeyboardWillHide = (e) => {
			this.keyboardWillOpenTo = null;
			this.props.onKeyboardWillHide && this.props.onKeyboardWillHide(e);
		};
		this.scrollResponderKeyboardDidShow = (e) => {
			if (e) this.keyboardWillOpenTo = e;
			this.props.onKeyboardDidShow && this.props.onKeyboardDidShow(e);
		};
		this.scrollResponderKeyboardDidHide = (e) => {
			this.keyboardWillOpenTo = null;
			this.props.onKeyboardDidHide && this.props.onKeyboardDidHide(e);
		};
		this.flashScrollIndicators = () => {
			this.scrollResponderFlashScrollIndicators();
		};
		this.getScrollResponder = () => {
			return this;
		};
		this.getScrollableNode = () => {
			return this._scrollNodeRef;
		};
		this.getInnerViewRef = () => {
			return this._innerViewRef;
		};
		this.getInnerViewNode = () => {
			return this._innerViewRef;
		};
		this.getNativeScrollRef = () => {
			return this._scrollNodeRef;
		};
		this.scrollTo = (y, x, animated) => {
			if (typeof y === "number") console.warn("`scrollTo(y, x, animated)` is deprecated. Use `scrollTo({x: 5, y: 5, animated: true})` instead.");
			else {
				var _ref2 = y || emptyObject$4;
				x = _ref2.x;
				y = _ref2.y;
				animated = _ref2.animated;
			}
			this.scrollResponderScrollTo({
				x: x || 0,
				y: y || 0,
				animated: animated !== false
			});
		};
		this.scrollToEnd = (options) => {
			var animated = (options && options.animated) !== false;
			var horizontal = this.props.horizontal;
			var scrollResponderNode = this.getScrollableNode();
			var x = horizontal ? scrollResponderNode.scrollWidth : 0;
			var y = horizontal ? 0 : scrollResponderNode.scrollHeight;
			this.scrollResponderScrollTo({
				x,
				y,
				animated
			});
		};
		this._handleContentOnLayout = (e) => {
			var _e$nativeEvent$layout = e.nativeEvent.layout, width = _e$nativeEvent$layout.width, height = _e$nativeEvent$layout.height;
			this.props.onContentSizeChange(width, height);
		};
		this._handleScroll = (e) => {
			if (this.props.onScroll && this.props.scrollEventThrottle == null) console.log("You specified `onScroll` on a <ScrollView> but not `scrollEventThrottle`. You will only receive one event. Using `16` you get all the events but be aware that it may cause frame drops, use a bigger number if you don't need as much precision.");
			if (this.props.keyboardDismissMode === "on-drag") dismissKeyboard();
			this.scrollResponderHandleScroll(e);
		};
		this._setInnerViewRef = (node) => {
			this._innerViewRef = node;
		};
		this._setScrollNodeRef = (node) => {
			this._scrollNodeRef = node;
			if (node != null) {
				node.getScrollResponder = this.getScrollResponder;
				node.getInnerViewNode = this.getInnerViewNode;
				node.getInnerViewRef = this.getInnerViewRef;
				node.getNativeScrollRef = this.getNativeScrollRef;
				node.getScrollableNode = this.getScrollableNode;
				node.scrollTo = this.scrollTo;
				node.scrollToEnd = this.scrollToEnd;
				node.flashScrollIndicators = this.flashScrollIndicators;
				node.scrollResponderZoomTo = this.scrollResponderZoomTo;
				node.scrollResponderScrollNativeHandleToKeyboard = this.scrollResponderScrollNativeHandleToKeyboard;
			}
			mergeRefs(this.props.forwardedRef)(node);
		};
	}
	/**
	* ------------------------------------------------------
	* START SCROLLRESPONDER
	* ------------------------------------------------------
	*/
	/**
	* Invoke this from an `onScroll` event.
	*/
	/**
	* Merely touch starting is not sufficient for a scroll view to become the
	* responder. Being the "responder" means that the very next touch move/end
	* event will result in an action/movement.
	*
	* Invoke this from an `onStartShouldSetResponder` event.
	*
	* `onStartShouldSetResponder` is used when the next move/end will trigger
	* some UI movement/action, but when you want to yield priority to views
	* nested inside of the view.
	*
	* There may be some cases where scroll views actually should return `true`
	* from `onStartShouldSetResponder`: Any time we are detecting a standard tap
	* that gives priority to nested views.
	*
	* - If a single tap on the scroll view triggers an action such as
	*   recentering a map style view yet wants to give priority to interaction
	*   views inside (such as dropped pins or labels), then we would return true
	*   from this method when there is a single touch.
	*
	* - Similar to the previous case, if a two finger "tap" should trigger a
	*   zoom, we would check the `touches` count, and if `>= 2`, we would return
	*   true.
	*
	*/
	scrollResponderHandleStartShouldSetResponder() {
		return false;
	}
	/**
	* There are times when the scroll view wants to become the responder
	* (meaning respond to the next immediate `touchStart/touchEnd`), in a way
	* that *doesn't* give priority to nested views (hence the capture phase):
	*
	* - Currently animating.
	* - Tapping anywhere that is not the focused input, while the keyboard is
	*   up (which should dismiss the keyboard).
	*
	* Invoke this from an `onStartShouldSetResponderCapture` event.
	*/
	/**
	* Invoke this from an `onResponderReject` event.
	*
	* Some other element is not yielding its role as responder. Normally, we'd
	* just disable the `UIScrollView`, but a touch has already began on it, the
	* `UIScrollView` will not accept being disabled after that. The easiest
	* solution for now is to accept the limitation of disallowing this
	* altogether. To improve this, find a way to disable the `UIScrollView` after
	* a touch has already started.
	*/
	scrollResponderHandleResponderReject() {
		(0, import_warning.default)(false, "ScrollView doesn't take rejection well - scrolls anyway");
	}
	/**
	* We will allow the scroll view to give up its lock iff it acquired the lock
	* during an animation. This is a very useful default that happens to satisfy
	* many common user experiences.
	*
	* - Stop a scroll on the left edge, then turn that into an outer view's
	*   backswipe.
	* - Stop a scroll mid-bounce at the top, continue pulling to have the outer
	*   view dismiss.
	* - However, without catching the scroll view mid-bounce (while it is
	*   motionless), if you drag far enough for the scroll view to become
	*   responder (and therefore drag the scroll view a bit), any backswipe
	*   navigation of a swipe gesture higher in the view hierarchy, should be
	*   rejected.
	*/
	/**
	* Invoke this from an `onTouchEnd` event.
	*
	* @param {SyntheticEvent} e Event.
	*/
	/**
	* Invoke this from an `onResponderRelease` event.
	*/
	/**
	* Invoke this from an `onResponderGrant` event.
	*/
	/**
	* Unfortunately, `onScrollBeginDrag` also fires when *stopping* the scroll
	* animation, and there's not an easy way to distinguish a drag vs. stopping
	* momentum.
	*
	* Invoke this from an `onScrollBeginDrag` event.
	*/
	/**
	* Invoke this from an `onScrollEndDrag` event.
	*/
	/**
	* Invoke this from an `onMomentumScrollBegin` event.
	*/
	/**
	* Invoke this from an `onMomentumScrollEnd` event.
	*/
	/**
	* Invoke this from an `onTouchStart` event.
	*
	* Since we know that the `SimpleEventPlugin` occurs later in the plugin
	* order, after `ResponderEventPlugin`, we can detect that we were *not*
	* permitted to be the responder (presumably because a contained view became
	* responder). The `onResponderReject` won't fire in that case - it only
	* fires when a *current* responder rejects our request.
	*
	* @param {SyntheticEvent} e Touch Start event.
	*/
	/**
	* Invoke this from an `onTouchMove` event.
	*
	* Since we know that the `SimpleEventPlugin` occurs later in the plugin
	* order, after `ResponderEventPlugin`, we can detect that we were *not*
	* permitted to be the responder (presumably because a contained view became
	* responder). The `onResponderReject` won't fire in that case - it only
	* fires when a *current* responder rejects our request.
	*
	* @param {SyntheticEvent} e Touch Start event.
	*/
	/**
	* A helper function for this class that lets us quickly determine if the
	* view is currently animating. This is particularly useful to know when
	* a touch has just started or ended.
	*/
	/**
	* A helper function to scroll to a specific point in the scrollview.
	* This is currently used to help focus on child textviews, but can also
	* be used to quickly scroll to any element we want to focus. Syntax:
	*
	* scrollResponderScrollTo(options: {x: number = 0; y: number = 0; animated: boolean = true})
	*
	* Note: The weird argument signature is due to the fact that, for historical reasons,
	* the function also accepts separate arguments as as alternative to the options object.
	* This is deprecated due to ambiguity (y before x), and SHOULD NOT BE USED.
	*/
	/**
	* A helper function to zoom to a specific rect in the scrollview. The argument has the shape
	* {x: number; y: number; width: number; height: number; animated: boolean = true}
	*
	* @platform ios
	*/
	/**
	* Displays the scroll indicators momentarily.
	*/
	scrollResponderFlashScrollIndicators() {}
	/**
	* This method should be used as the callback to onFocus in a TextInputs'
	* parent view. Note that any module using this mixin needs to return
	* the parent view's ref in getScrollViewRef() in order to use this method.
	* @param {any} nodeHandle The TextInput node handle
	* @param {number} additionalOffset The scroll view's top "contentInset".
	*        Default is 0.
	* @param {bool} preventNegativeScrolling Whether to allow pulling the content
	*        down to make it meet the keyboard's top. Default is false.
	*/
	/**
	* The calculations performed here assume the scroll view takes up the entire
	* screen - even if has some content inset. We then measure the offsets of the
	* keyboard, and compensate both for the scroll view's "contentInset".
	*
	* @param {number} left Position of input w.r.t. table view.
	* @param {number} top Position of input w.r.t. table view.
	* @param {number} width Width of the text input.
	* @param {number} height Height of the text input.
	*/
	scrollResponderTextInputFocusError(e) {
		console.error("Error measuring text field: ", e);
	}
	/**
	* Warning, this may be called several times for a single keyboard opening.
	* It's best to store the information in this method and then take any action
	* at a later point (either in `keyboardDidShow` or other).
	*
	* Here's the order that events occur in:
	* - focus
	* - willShow {startCoordinates, endCoordinates} several times
	* - didShow several times
	* - blur
	* - willHide {startCoordinates, endCoordinates} several times
	* - didHide several times
	*
	* The `ScrollResponder` providesModule callbacks for each of these events.
	* Even though any user could have easily listened to keyboard events
	* themselves, using these `props` callbacks ensures that ordering of events
	* is consistent - and not dependent on the order that the keyboard events are
	* subscribed to. This matters when telling the scroll view to scroll to where
	* the keyboard is headed - the scroll responder better have been notified of
	* the keyboard destination before being instructed to scroll to where the
	* keyboard will be. Stick to the `ScrollResponder` callbacks, and everything
	* will work.
	*
	* WARNING: These callbacks will fire even if a keyboard is displayed in a
	* different navigation pane. Filter out the events to determine if they are
	* relevant to you. (For example, only if you receive these callbacks after
	* you had explicitly focused a node etc).
	*/
	/**
	* ------------------------------------------------------
	* END SCROLLRESPONDER
	* ------------------------------------------------------
	*/
	/**
	* Returns a reference to the underlying scroll responder, which supports
	* operations like `scrollTo`. All ScrollView-like components should
	* implement this method so that they can be composed while providing access
	* to the underlying scroll responder's methods.
	*/
	/**
	* Scrolls to a given x, y offset, either immediately or with a smooth animation.
	* Syntax:
	*
	* scrollTo(options: {x: number = 0; y: number = 0; animated: boolean = true})
	*
	* Note: The weird argument signature is due to the fact that, for historical reasons,
	* the function also accepts separate arguments as as alternative to the options object.
	* This is deprecated due to ambiguity (y before x), and SHOULD NOT BE USED.
	*/
	/**
	* If this is a vertical ScrollView scrolls to the bottom.
	* If this is a horizontal ScrollView scrolls to the right.
	*
	* Use `scrollToEnd({ animated: true })` for smooth animated scrolling,
	* `scrollToEnd({ animated: false })` for immediate scrolling.
	* If no options are passed, `animated` defaults to true.
	*/
	render() {
		var _this$props = this.props, contentContainerStyle = _this$props.contentContainerStyle, horizontal = _this$props.horizontal, onContentSizeChange = _this$props.onContentSizeChange, refreshControl = _this$props.refreshControl, stickyHeaderIndices = _this$props.stickyHeaderIndices, pagingEnabled = _this$props.pagingEnabled;
		_this$props.forwardedRef;
		_this$props.keyboardDismissMode;
		_this$props.onScroll;
		var centerContent = _this$props.centerContent, other = _objectWithoutPropertiesLoose(_this$props, _excluded$20);
		if (this.props.style) {
			var style = stylesheet.flatten(this.props.style);
			var childLayoutProps = ["alignItems", "justifyContent"].filter((prop) => style && style[prop] !== void 0);
			(0, import_invariant.default)(childLayoutProps.length === 0, "ScrollView child layout (" + JSON.stringify(childLayoutProps) + ") must be applied through the contentContainerStyle prop.");
		}
		var contentSizeChangeProps = {};
		if (onContentSizeChange) contentSizeChangeProps = { onLayout: this._handleContentOnLayout };
		var hasStickyHeaderIndices = !horizontal && Array.isArray(stickyHeaderIndices);
		var children = hasStickyHeaderIndices || pagingEnabled ? import_react.Children.map(this.props.children, (child, i) => {
			var isSticky = hasStickyHeaderIndices && stickyHeaderIndices.indexOf(i) > -1;
			if (child != null && (isSticky || pagingEnabled)) return /*#__PURE__*/ import_react.createElement(View, { style: [isSticky && styles$20.stickyHeader, pagingEnabled && styles$20.pagingEnabledChild] }, child);
			else return child;
		}) : this.props.children;
		var contentContainer = /*#__PURE__*/ import_react.createElement(View, _extends({}, contentSizeChangeProps, {
			children,
			collapsable: false,
			ref: this._setInnerViewRef,
			style: [
				horizontal && styles$20.contentContainerHorizontal,
				centerContent && styles$20.contentContainerCenterContent,
				contentContainerStyle
			]
		}));
		var baseStyle = horizontal ? styles$20.baseHorizontal : styles$20.baseVertical;
		var pagingEnabledStyle = horizontal ? styles$20.pagingEnabledHorizontal : styles$20.pagingEnabledVertical;
		var props = _objectSpread2(_objectSpread2({}, other), {}, {
			style: [
				baseStyle,
				pagingEnabled && pagingEnabledStyle,
				this.props.style
			],
			onTouchStart: this.scrollResponderHandleTouchStart,
			onTouchMove: this.scrollResponderHandleTouchMove,
			onTouchEnd: this.scrollResponderHandleTouchEnd,
			onScrollBeginDrag: this.scrollResponderHandleScrollBeginDrag,
			onScrollEndDrag: this.scrollResponderHandleScrollEndDrag,
			onMomentumScrollBegin: this.scrollResponderHandleMomentumScrollBegin,
			onMomentumScrollEnd: this.scrollResponderHandleMomentumScrollEnd,
			onStartShouldSetResponder: this.scrollResponderHandleStartShouldSetResponder,
			onStartShouldSetResponderCapture: this.scrollResponderHandleStartShouldSetResponderCapture,
			onScrollShouldSetResponder: this.scrollResponderHandleScrollShouldSetResponder,
			onScroll: this._handleScroll,
			onResponderGrant: this.scrollResponderHandleResponderGrant,
			onResponderTerminationRequest: this.scrollResponderHandleTerminationRequest,
			onResponderTerminate: this.scrollResponderHandleTerminate,
			onResponderRelease: this.scrollResponderHandleResponderRelease,
			onResponderReject: this.scrollResponderHandleResponderReject
		});
		var ScrollViewClass = ScrollViewBase;
		(0, import_invariant.default)(ScrollViewClass !== void 0, "ScrollViewClass must not be undefined");
		var scrollView = /*#__PURE__*/ import_react.createElement(ScrollViewClass, _extends({}, props, { ref: this._setScrollNodeRef }), contentContainer);
		if (refreshControl) return /*#__PURE__*/ import_react.cloneElement(refreshControl, { style: props.style }, scrollView);
		return scrollView;
	}
};
var commonStyle = {
	flexGrow: 1,
	flexShrink: 1,
	transform: "translateZ(0)",
	WebkitOverflowScrolling: "touch"
};
var styles$20 = stylesheet.create({
	baseVertical: _objectSpread2(_objectSpread2({}, commonStyle), {}, {
		flexDirection: "column",
		overflowX: "hidden",
		overflowY: "auto"
	}),
	baseHorizontal: _objectSpread2(_objectSpread2({}, commonStyle), {}, {
		flexDirection: "row",
		overflowX: "auto",
		overflowY: "hidden"
	}),
	contentContainerHorizontal: { flexDirection: "row" },
	contentContainerCenterContent: {
		justifyContent: "center",
		flexGrow: 1
	},
	stickyHeader: {
		position: "sticky",
		top: 0,
		zIndex: 10
	},
	pagingEnabledHorizontal: { scrollSnapType: "x mandatory" },
	pagingEnabledVertical: { scrollSnapType: "y mandatory" },
	pagingEnabledChild: { scrollSnapAlign: "start" }
});
var ForwardedScrollView = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	return /*#__PURE__*/ import_react.createElement(ScrollView, _extends({}, props, { forwardedRef }));
});
ForwardedScrollView.displayName = "ScrollView";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/InteractionManager/TaskQueue.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var TaskQueue = class {
	constructor(_ref) {
		var onMoreTasks = _ref.onMoreTasks;
		this._onMoreTasks = onMoreTasks;
		this._queueStack = [{
			tasks: [],
			popable: true
		}];
	}
	enqueue(task) {
		this._getCurrentQueue().push(task);
	}
	enqueueTasks(tasks) {
		tasks.forEach((task) => this.enqueue(task));
	}
	cancelTasks(tasksToCancel) {
		this._queueStack = this._queueStack.map((queue) => _objectSpread2(_objectSpread2({}, queue), {}, { tasks: queue.tasks.filter((task) => tasksToCancel.indexOf(task) === -1) })).filter((queue, idx) => queue.tasks.length > 0 || idx === 0);
	}
	hasTasksToProcess() {
		return this._getCurrentQueue().length > 0;
	}
	/**
	* Executes the next task in the queue.
	*/
	processNext() {
		var queue = this._getCurrentQueue();
		if (queue.length) {
			var task = queue.shift();
			try {
				if (typeof task === "object" && task.gen) this._genPromise(task);
				else if (typeof task === "object" && task.run) task.run();
				else {
					(0, import_invariant.default)(typeof task === "function", "Expected Function, SimpleTask, or PromiseTask, but got:\n" + JSON.stringify(task, null, 2));
					task();
				}
			} catch (e) {
				e.message = "TaskQueue: Error with task " + (task.name || "") + ": " + e.message;
				throw e;
			}
		}
	}
	_getCurrentQueue() {
		var stackIdx = this._queueStack.length - 1;
		var queue = this._queueStack[stackIdx];
		if (queue.popable && queue.tasks.length === 0 && stackIdx > 0) {
			this._queueStack.pop();
			return this._getCurrentQueue();
		} else return queue.tasks;
	}
	_genPromise(task) {
		var stackIdx = this._queueStack.push({
			tasks: [],
			popable: false
		}) - 1;
		var stackItem = this._queueStack[stackIdx];
		task.gen().then(() => {
			stackItem.popable = true;
			this.hasTasksToProcess() && this._onMoreTasks();
		}).catch((ex) => {
			setTimeout(() => {
				ex.message = "TaskQueue: Error resolving Promise in task " + task.name + ": " + ex.message;
				throw ex;
			}, 0);
		});
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/vendor/emitter/EventEmitter.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* EventEmitter manages listeners and publishes events to them.
*
* EventEmitter accepts a single type parameter that defines the valid events
* and associated listener argument(s).
*
* @example
*
*   const emitter = new EventEmitter<{
*     success: [number, string],
*     error: [Error],
*   }>();
*
*   emitter.on('success', (statusCode, responseText) => {...});
*   emitter.emit('success', 200, '...');
*
*   emitter.on('error', error => {...});
*   emitter.emit('error', new Error('Resource not found'));
*
*/
var EventEmitter = class {
	constructor() {
		this._registry = {};
	}
	/**
	* Registers a listener that is called when the supplied event is emitted.
	* Returns a subscription that has a `remove` method to undo registration.
	*/
	addListener(eventType, listener, context) {
		var registrations = allocate(this._registry, eventType);
		var registration = {
			context,
			listener,
			remove() {
				registrations.delete(registration);
			}
		};
		registrations.add(registration);
		return registration;
	}
	/**
	* Emits the supplied event. Additional arguments supplied to `emit` will be
	* passed through to each of the registered listeners.
	*
	* If a listener modifies the listeners registered for the same event, those
	* changes will not be reflected in the current invocation of `emit`.
	*/
	emit(eventType) {
		var registrations = this._registry[eventType];
		if (registrations != null) {
			for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
			for (var _i = 0, _arr = [...registrations]; _i < _arr.length; _i++) {
				var registration = _arr[_i];
				registration.listener.apply(registration.context, args);
			}
		}
	}
	/**
	* Removes all registered listeners.
	*/
	removeAllListeners(eventType) {
		if (eventType == null) this._registry = {};
		else delete this._registry[eventType];
	}
	/**
	* Returns the number of registered listeners for the supplied event.
	*/
	listenerCount(eventType) {
		var registrations = this._registry[eventType];
		return registrations == null ? 0 : registrations.size;
	}
};
function allocate(registry, eventType) {
	var registrations = registry[eventType];
	if (registrations == null) {
		registrations = /* @__PURE__ */ new Set();
		registry[eventType] = registrations;
	}
	return registrations;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/requestIdleCallback/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _requestIdleCallback = function _requestIdleCallback(cb, options) {
	return setTimeout(() => {
		var start = Date.now();
		cb({
			didTimeout: false,
			timeRemaining() {
				return Math.max(0, 50 - (Date.now() - start));
			}
		});
	}, 1);
};
var isSupported = canUseDOM && typeof window.requestIdleCallback !== "undefined";
var requestIdleCallback = isSupported ? window.requestIdleCallback : _requestIdleCallback;
isSupported && window.cancelIdleCallback;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/InteractionManager/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _emitter = new EventEmitter();
var InteractionManager = {
	Events: {
		interactionStart: "interactionStart",
		interactionComplete: "interactionComplete"
	},
	/**
	* Schedule a function to run after all interactions have completed.
	*/
	runAfterInteractions(task) {
		var tasks = [];
		var promise = new Promise((resolve) => {
			_scheduleUpdate();
			if (task) tasks.push(task);
			tasks.push({
				run: resolve,
				name: "resolve " + (task && task.name || "?")
			});
			_taskQueue.enqueueTasks(tasks);
		});
		return {
			then: promise.then.bind(promise),
			done: promise.then.bind(promise),
			cancel: () => {
				_taskQueue.cancelTasks(tasks);
			}
		};
	},
	/**
	* Notify manager that an interaction has started.
	*/
	createInteractionHandle() {
		_scheduleUpdate();
		var handle = ++_inc;
		_addInteractionSet.add(handle);
		return handle;
	},
	/**
	* Notify manager that an interaction has completed.
	*/
	clearInteractionHandle(handle) {
		(0, import_invariant.default)(!!handle, "Must provide a handle to clear.");
		_scheduleUpdate();
		_addInteractionSet.delete(handle);
		_deleteInteractionSet.add(handle);
	},
	addListener: _emitter.addListener.bind(_emitter),
	/**
	*
	* @param deadline
	*/
	setDeadline(deadline) {
		_deadline = deadline;
	}
};
var _interactionSet = /* @__PURE__ */ new Set();
var _addInteractionSet = /* @__PURE__ */ new Set();
var _deleteInteractionSet = /* @__PURE__ */ new Set();
var _taskQueue = new TaskQueue({ onMoreTasks: _scheduleUpdate });
var _nextUpdateHandle = 0;
var _inc = 0;
var _deadline = -1;
/**
* Schedule an asynchronous update to the interaction state.
*/
function _scheduleUpdate() {
	if (!_nextUpdateHandle) {
		if (_deadline > 0) _nextUpdateHandle = setTimeout(_processUpdate);
		else _nextUpdateHandle = requestIdleCallback(_processUpdate);
	}
}
/**
* Notify listeners, process queue, etc
*/
function _processUpdate() {
	_nextUpdateHandle = 0;
	var interactionCount = _interactionSet.size;
	_addInteractionSet.forEach((handle) => _interactionSet.add(handle));
	_deleteInteractionSet.forEach((handle) => _interactionSet.delete(handle));
	var nextInteractionCount = _interactionSet.size;
	if (interactionCount !== 0 && nextInteractionCount === 0) _emitter.emit(InteractionManager.Events.interactionComplete);
	else if (interactionCount === 0 && nextInteractionCount !== 0) _emitter.emit(InteractionManager.Events.interactionStart);
	if (nextInteractionCount === 0) {
		var begin = Date.now();
		while (_taskQueue.hasTasksToProcess()) {
			_taskQueue.processNext();
			if (_deadline > 0 && Date.now() - begin >= _deadline) {
				_scheduleUpdate();
				break;
			}
		}
	}
	_addInteractionSet.clear();
	_deleteInteractionSet.clear();
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Batchinator/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
/**
* A simple class for batching up invocations of a low-pri callback. A timeout is set to run the
* callback once after a delay, no matter how many times it's scheduled. Once the delay is reached,
* InteractionManager.runAfterInteractions is used to invoke the callback after any hi-pri
* interactions are done running.
*
* Make sure to cleanup with dispose().  Example:
*
*   class Widget extends React.Component {
*     _batchedSave: new Batchinator(() => this._saveState, 1000);
*     _saveSate() {
*       // save this.state to disk
*     }
*     componentDidUpdate() {
*       this._batchedSave.schedule();
*     }
*     componentWillUnmount() {
*       this._batchedSave.dispose();
*     }
*     ...
*   }
*/
var Batchinator = class {
	constructor(callback, delayMS) {
		this._delay = delayMS;
		this._callback = callback;
	}
	dispose(options) {
		if (options === void 0) options = { abort: false };
		if (this._taskHandle) {
			this._taskHandle.cancel();
			if (!options.abort) this._callback();
			this._taskHandle = null;
		}
	}
	schedule() {
		if (this._taskHandle) return;
		var timeoutHandle = setTimeout(() => {
			this._taskHandle = InteractionManager.runAfterInteractions(() => {
				this._taskHandle = null;
				this._callback();
			});
		}, this._delay);
		this._taskHandle = { cancel: () => clearTimeout(timeoutHandle) };
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Utilities/clamp.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
function clamp(min, value, max) {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/infoLog/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
/**
* Intentional info-level logging for clear separation from ad-hoc console debug logging.
*/
function infoLog() {
	return console.log(...arguments);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/CellRenderMask.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var CellRenderMask = class {
	constructor(numCells) {
		(0, import_invariant.default)(numCells >= 0, "CellRenderMask must contain a non-negative number os cells");
		this._numCells = numCells;
		if (numCells === 0) this._regions = [];
		else this._regions = [{
			first: 0,
			last: numCells - 1,
			isSpacer: true
		}];
	}
	enumerateRegions() {
		return this._regions;
	}
	addCells(cells) {
		(0, import_invariant.default)(cells.first >= 0 && cells.first < this._numCells && cells.last >= -1 && cells.last < this._numCells && cells.last >= cells.first - 1, "CellRenderMask.addCells called with invalid cell range");
		if (cells.last < cells.first) return;
		var _this$_findRegion = this._findRegion(cells.first), firstIntersect = _this$_findRegion[0], firstIntersectIdx = _this$_findRegion[1];
		var _this$_findRegion2 = this._findRegion(cells.last), lastIntersect = _this$_findRegion2[0], lastIntersectIdx = _this$_findRegion2[1];
		if (firstIntersectIdx === lastIntersectIdx && !firstIntersect.isSpacer) return;
		var newLeadRegion = [];
		var newTailRegion = [];
		var newMainRegion = _objectSpread2(_objectSpread2({}, cells), {}, { isSpacer: false });
		if (firstIntersect.first < newMainRegion.first) {
			if (firstIntersect.isSpacer) newLeadRegion.push({
				first: firstIntersect.first,
				last: newMainRegion.first - 1,
				isSpacer: true
			});
			else newMainRegion.first = firstIntersect.first;
		}
		if (lastIntersect.last > newMainRegion.last) {
			if (lastIntersect.isSpacer) newTailRegion.push({
				first: newMainRegion.last + 1,
				last: lastIntersect.last,
				isSpacer: true
			});
			else newMainRegion.last = lastIntersect.last;
		}
		var replacementRegions = [
			...newLeadRegion,
			newMainRegion,
			...newTailRegion
		];
		var numRegionsToDelete = lastIntersectIdx - firstIntersectIdx + 1;
		this._regions.splice(firstIntersectIdx, numRegionsToDelete, ...replacementRegions);
	}
	numCells() {
		return this._numCells;
	}
	equals(other) {
		return this._numCells === other._numCells && this._regions.length === other._regions.length && this._regions.every((region, i) => region.first === other._regions[i].first && region.last === other._regions[i].last && region.isSpacer === other._regions[i].isSpacer);
	}
	_findRegion(cellIdx) {
		var firstIdx = 0;
		var lastIdx = this._regions.length - 1;
		while (firstIdx <= lastIdx) {
			var middleIdx = Math.floor((firstIdx + lastIdx) / 2);
			var middleRegion = this._regions[middleIdx];
			if (cellIdx >= middleRegion.first && cellIdx <= middleRegion.last) return [middleRegion, middleIdx];
			else if (cellIdx < middleRegion.first) lastIdx = middleIdx - 1;
			else if (cellIdx > middleRegion.last) firstIdx = middleIdx + 1;
		}
		(0, import_invariant.default)(false, "A region was not found containing cellIdx " + cellIdx);
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/ChildListCollection.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var ChildListCollection = class {
	constructor() {
		this._cellKeyToChildren = /* @__PURE__ */ new Map();
		this._childrenToCellKey = /* @__PURE__ */ new Map();
	}
	add(list, cellKey) {
		var _this$_cellKeyToChild;
		(0, import_invariant.default)(!this._childrenToCellKey.has(list), "Trying to add already present child list");
		var cellLists = (_this$_cellKeyToChild = this._cellKeyToChildren.get(cellKey)) !== null && _this$_cellKeyToChild !== void 0 ? _this$_cellKeyToChild : /* @__PURE__ */ new Set();
		cellLists.add(list);
		this._cellKeyToChildren.set(cellKey, cellLists);
		this._childrenToCellKey.set(list, cellKey);
	}
	remove(list) {
		var cellKey = this._childrenToCellKey.get(list);
		(0, import_invariant.default)(cellKey != null, "Trying to remove non-present child list");
		this._childrenToCellKey.delete(list);
		var cellLists = this._cellKeyToChildren.get(cellKey);
		(0, import_invariant.default)(cellLists, "_cellKeyToChildren should contain cellKey");
		cellLists.delete(list);
		if (cellLists.size === 0) this._cellKeyToChildren.delete(cellKey);
	}
	forEach(fn) {
		for (var _iterator = _createForOfIteratorHelperLoose(this._cellKeyToChildren.values()), _step; !(_step = _iterator()).done;) {
			var listSet = _step.value;
			for (var _iterator2 = _createForOfIteratorHelperLoose(listSet), _step2; !(_step2 = _iterator2()).done;) {
				var list = _step2.value;
				fn(list);
			}
		}
	}
	forEachInCell(cellKey, fn) {
		var _this$_cellKeyToChild2;
		for (var _iterator3 = _createForOfIteratorHelperLoose((_this$_cellKeyToChild2 = this._cellKeyToChildren.get(cellKey)) !== null && _this$_cellKeyToChild2 !== void 0 ? _this$_cellKeyToChild2 : []), _step3; !(_step3 = _iterator3()).done;) {
			var list = _step3.value;
			fn(list);
		}
	}
	anyInCell(cellKey, fn) {
		var _this$_cellKeyToChild3;
		for (var _iterator4 = _createForOfIteratorHelperLoose((_this$_cellKeyToChild3 = this._cellKeyToChildren.get(cellKey)) !== null && _this$_cellKeyToChild3 !== void 0 ? _this$_cellKeyToChild3 : []), _step4; !(_step4 = _iterator4()).done;) {
			var list = _step4.value;
			if (fn(list)) return true;
		}
		return false;
	}
	size() {
		return this._childrenToCellKey.size;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/FillRateHelper/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var Info = class {
	constructor() {
		this.any_blank_count = 0;
		this.any_blank_ms = 0;
		this.any_blank_speed_sum = 0;
		this.mostly_blank_count = 0;
		this.mostly_blank_ms = 0;
		this.pixels_blank = 0;
		this.pixels_sampled = 0;
		this.pixels_scrolled = 0;
		this.total_time_spent = 0;
		this.sample_count = 0;
	}
};
var DEBUG = false;
var _listeners = [];
var _minSampleCount = 10;
var _sampleRate = DEBUG ? 1 : null;
/**
* A helper class for detecting when the maximem fill rate of `VirtualizedList` is exceeded.
* By default the sampling rate is set to zero and this will do nothing. If you want to collect
* samples (e.g. to log them), make sure to call `FillRateHelper.setSampleRate(0.0-1.0)`.
*
* Listeners and sample rate are global for all `VirtualizedList`s - typical usage will combine with
* `SceneTracker.getActiveScene` to determine the context of the events.
*/
var FillRateHelper = class {
	static addListener(callback) {
		if (_sampleRate === null) console.warn("Call `FillRateHelper.setSampleRate` before `addListener`.");
		_listeners.push(callback);
		return { remove: () => {
			_listeners = _listeners.filter((listener) => callback !== listener);
		} };
	}
	static setSampleRate(sampleRate) {
		_sampleRate = sampleRate;
	}
	static setMinSampleCount(minSampleCount) {
		_minSampleCount = minSampleCount;
	}
	constructor(getFrameMetrics) {
		this._anyBlankStartTime = null;
		this._enabled = false;
		this._info = new Info();
		this._mostlyBlankStartTime = null;
		this._samplesStartTime = null;
		this._getFrameMetrics = getFrameMetrics;
		this._enabled = (_sampleRate || 0) > Math.random();
		this._resetData();
	}
	activate() {
		if (this._enabled && this._samplesStartTime == null) this._samplesStartTime = global.performance.now();
	}
	deactivateAndFlush() {
		if (!this._enabled) return;
		var start = this._samplesStartTime;
		if (start == null) return;
		if (this._info.sample_count < _minSampleCount) {
			this._resetData();
			return;
		}
		var total_time_spent = global.performance.now() - start;
		var info = _objectSpread2(_objectSpread2({}, this._info), {}, { total_time_spent });
		if (DEBUG) {
			var derived = {
				avg_blankness: this._info.pixels_blank / this._info.pixels_sampled,
				avg_speed: this._info.pixels_scrolled / (total_time_spent / 1e3),
				avg_speed_when_any_blank: this._info.any_blank_speed_sum / this._info.any_blank_count,
				any_blank_per_min: this._info.any_blank_count / (total_time_spent / 1e3 / 60),
				any_blank_time_frac: this._info.any_blank_ms / total_time_spent,
				mostly_blank_per_min: this._info.mostly_blank_count / (total_time_spent / 1e3 / 60),
				mostly_blank_time_frac: this._info.mostly_blank_ms / total_time_spent
			};
			for (var key in derived) derived[key] = Math.round(1e3 * derived[key]) / 1e3;
			console.debug("FillRateHelper deactivateAndFlush: ", {
				derived,
				info
			});
		}
		_listeners.forEach((listener) => listener(info));
		this._resetData();
	}
	computeBlankness(props, cellsAroundViewport, scrollMetrics) {
		if (!this._enabled || props.getItemCount(props.data) === 0 || cellsAroundViewport.last < cellsAroundViewport.first || this._samplesStartTime == null) return 0;
		var dOffset = scrollMetrics.dOffset, offset = scrollMetrics.offset, velocity = scrollMetrics.velocity, visibleLength = scrollMetrics.visibleLength;
		this._info.sample_count++;
		this._info.pixels_sampled += Math.round(visibleLength);
		this._info.pixels_scrolled += Math.round(Math.abs(dOffset));
		var scrollSpeed = Math.round(Math.abs(velocity) * 1e3);
		var now = global.performance.now();
		if (this._anyBlankStartTime != null) this._info.any_blank_ms += now - this._anyBlankStartTime;
		this._anyBlankStartTime = null;
		if (this._mostlyBlankStartTime != null) this._info.mostly_blank_ms += now - this._mostlyBlankStartTime;
		this._mostlyBlankStartTime = null;
		var blankTop = 0;
		var first = cellsAroundViewport.first;
		var firstFrame = this._getFrameMetrics(first, props);
		while (first <= cellsAroundViewport.last && (!firstFrame || !firstFrame.inLayout)) {
			firstFrame = this._getFrameMetrics(first, props);
			first++;
		}
		if (firstFrame && first > 0) blankTop = Math.min(visibleLength, Math.max(0, firstFrame.offset - offset));
		var blankBottom = 0;
		var last = cellsAroundViewport.last;
		var lastFrame = this._getFrameMetrics(last, props);
		while (last >= cellsAroundViewport.first && (!lastFrame || !lastFrame.inLayout)) {
			lastFrame = this._getFrameMetrics(last, props);
			last--;
		}
		if (lastFrame && last < props.getItemCount(props.data) - 1) {
			var bottomEdge = lastFrame.offset + lastFrame.length;
			blankBottom = Math.min(visibleLength, Math.max(0, offset + visibleLength - bottomEdge));
		}
		var pixels_blank = Math.round(blankTop + blankBottom);
		var blankness = pixels_blank / visibleLength;
		if (blankness > 0) {
			this._anyBlankStartTime = now;
			this._info.any_blank_speed_sum += scrollSpeed;
			this._info.any_blank_count++;
			this._info.pixels_blank += pixels_blank;
			if (blankness > .5) {
				this._mostlyBlankStartTime = now;
				this._info.mostly_blank_count++;
			}
		} else if (scrollSpeed < .01 || Math.abs(dOffset) < 1) this.deactivateAndFlush();
		return blankness;
	}
	enabled() {
		return this._enabled;
	}
	_resetData() {
		this._anyBlankStartTime = null;
		this._info = new Info();
		this._mostlyBlankStartTime = null;
		this._samplesStartTime = null;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/StateSafePureComponent.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* `setState` is called asynchronously, and should not rely on the value of
* `this.props` or `this.state`:
* https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous
*
* SafePureComponent adds runtime enforcement, to catch cases where these
* variables are read in a state updater function, instead of the ones passed
* in.
*/
var StateSafePureComponent = class extends import_react.PureComponent {
	constructor(props) {
		super(props);
		this._inAsyncStateUpdate = false;
		this._installSetStateHooks();
	}
	setState(partialState, callback) {
		if (typeof partialState === "function") super.setState((state, props) => {
			this._inAsyncStateUpdate = true;
			var ret;
			try {
				ret = partialState(state, props);
			} catch (err) {
				throw err;
			} finally {
				this._inAsyncStateUpdate = false;
			}
			return ret;
		}, callback);
		else super.setState(partialState, callback);
	}
	_installSetStateHooks() {
		var that = this;
		var props = this.props, state = this.state;
		Object.defineProperty(this, "props", {
			get() {
				(0, import_invariant.default)(!that._inAsyncStateUpdate, "\"this.props\" should not be accessed during state updates");
				return props;
			},
			set(newProps) {
				props = newProps;
			}
		});
		Object.defineProperty(this, "state", {
			get() {
				(0, import_invariant.default)(!that._inAsyncStateUpdate, "\"this.state\" should not be acceessed during state updates");
				return state;
			},
			set(newState) {
				state = newState;
			}
		});
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/ViewabilityHelper/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* A Utility class for calculating viewable items based on current metrics like scroll position and
* layout.
*
* An item is said to be in a "viewable" state when any of the following
* is true for longer than `minimumViewTime` milliseconds (after an interaction if `waitForInteraction`
* is true):
*
* - Occupying >= `viewAreaCoveragePercentThreshold` of the view area XOR fraction of the item
*   visible in the view area >= `itemVisiblePercentThreshold`.
* - Entirely visible on screen
*/
var ViewabilityHelper = class {
	constructor(config) {
		if (config === void 0) config = { viewAreaCoveragePercentThreshold: 0 };
		this._hasInteracted = false;
		this._timers = /* @__PURE__ */ new Set();
		this._viewableIndices = [];
		this._viewableItems = /* @__PURE__ */ new Map();
		this._config = config;
	}
	/**
	* Cleanup, e.g. on unmount. Clears any pending timers.
	*/
	dispose() {
		this._timers.forEach(clearTimeout);
	}
	/**
	* Determines which items are viewable based on the current metrics and config.
	*/
	computeViewableItems(props, scrollOffset, viewportHeight, getFrameMetrics, renderRange) {
		var itemCount = props.getItemCount(props.data);
		var _this$_config = this._config, itemVisiblePercentThreshold = _this$_config.itemVisiblePercentThreshold, viewAreaCoveragePercentThreshold = _this$_config.viewAreaCoveragePercentThreshold;
		var viewAreaMode = viewAreaCoveragePercentThreshold != null;
		var viewablePercentThreshold = viewAreaMode ? viewAreaCoveragePercentThreshold : itemVisiblePercentThreshold;
		(0, import_invariant.default)(viewablePercentThreshold != null && itemVisiblePercentThreshold != null !== (viewAreaCoveragePercentThreshold != null), "Must set exactly one of itemVisiblePercentThreshold or viewAreaCoveragePercentThreshold");
		var viewableIndices = [];
		if (itemCount === 0) return viewableIndices;
		var firstVisible = -1;
		var _ref = renderRange || {
			first: 0,
			last: itemCount - 1
		}, first = _ref.first, last = _ref.last;
		if (last >= itemCount) {
			console.warn("Invalid render range computing viewability " + JSON.stringify({
				renderRange,
				itemCount
			}));
			return [];
		}
		for (var idx = first; idx <= last; idx++) {
			var metrics = getFrameMetrics(idx, props);
			if (!metrics) continue;
			var top = metrics.offset - scrollOffset;
			var bottom = top + metrics.length;
			if (top < viewportHeight && bottom > 0) {
				firstVisible = idx;
				if (_isViewable(viewAreaMode, viewablePercentThreshold, top, bottom, viewportHeight, metrics.length)) viewableIndices.push(idx);
			} else if (firstVisible >= 0) break;
		}
		return viewableIndices;
	}
	/**
	* Figures out which items are viewable and how that has changed from before and calls
	* `onViewableItemsChanged` as appropriate.
	*/
	onUpdate(props, scrollOffset, viewportHeight, getFrameMetrics, createViewToken, onViewableItemsChanged, renderRange) {
		var itemCount = props.getItemCount(props.data);
		if (this._config.waitForInteraction && !this._hasInteracted || itemCount === 0 || !getFrameMetrics(0, props)) return;
		var viewableIndices = [];
		if (itemCount) viewableIndices = this.computeViewableItems(props, scrollOffset, viewportHeight, getFrameMetrics, renderRange);
		if (this._viewableIndices.length === viewableIndices.length && this._viewableIndices.every((v, ii) => v === viewableIndices[ii])) return;
		this._viewableIndices = viewableIndices;
		if (this._config.minimumViewTime) {
			var handle = setTimeout(() => {
				this._timers.delete(handle);
				this._onUpdateSync(props, viewableIndices, onViewableItemsChanged, createViewToken);
			}, this._config.minimumViewTime);
			this._timers.add(handle);
		} else this._onUpdateSync(props, viewableIndices, onViewableItemsChanged, createViewToken);
	}
	/**
	* clean-up cached _viewableIndices to evaluate changed items on next update
	*/
	resetViewableIndices() {
		this._viewableIndices = [];
	}
	/**
	* Records that an interaction has happened even if there has been no scroll.
	*/
	recordInteraction() {
		this._hasInteracted = true;
	}
	_onUpdateSync(props, viewableIndicesToCheck, onViewableItemsChanged, createViewToken) {
		viewableIndicesToCheck = viewableIndicesToCheck.filter((ii) => this._viewableIndices.includes(ii));
		var prevItems = this._viewableItems;
		var nextItems = new Map(viewableIndicesToCheck.map((ii) => {
			var viewable = createViewToken(ii, true, props);
			return [viewable.key, viewable];
		}));
		var changed = [];
		for (var _iterator = _createForOfIteratorHelperLoose(nextItems), _step; !(_step = _iterator()).done;) {
			var _step$value = _step.value, key = _step$value[0], viewable = _step$value[1];
			if (!prevItems.has(key)) changed.push(viewable);
		}
		for (var _iterator2 = _createForOfIteratorHelperLoose(prevItems), _step2; !(_step2 = _iterator2()).done;) {
			var _step2$value = _step2.value, _key = _step2$value[0], _viewable = _step2$value[1];
			if (!nextItems.has(_key)) changed.push(_objectSpread2(_objectSpread2({}, _viewable), {}, { isViewable: false }));
		}
		if (changed.length > 0) {
			this._viewableItems = nextItems;
			onViewableItemsChanged({
				viewableItems: Array.from(nextItems.values()),
				changed,
				viewabilityConfig: this._config
			});
		}
	}
};
function _isViewable(viewAreaMode, viewablePercentThreshold, top, bottom, viewportHeight, itemLength) {
	if (_isEntirelyVisible(top, bottom, viewportHeight)) return true;
	else {
		var pixels = _getPixelsVisible(top, bottom, viewportHeight);
		return 100 * (viewAreaMode ? pixels / viewportHeight : pixels / itemLength) >= viewablePercentThreshold;
	}
}
function _getPixelsVisible(top, bottom, viewportHeight) {
	var visibleHeight = Math.min(bottom, viewportHeight) - Math.max(top, 0);
	return Math.max(0, visibleHeight);
}
function _isEntirelyVisible(top, bottom, viewportHeight) {
	return top >= 0 && bottom <= viewportHeight && bottom > top;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/VirtualizedListContext.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var __DEV__$3 = true;
var VirtualizedListContext = /*#__PURE__*/ import_react.createContext(null);
if (__DEV__$3) VirtualizedListContext.displayName = "VirtualizedListContext";
/**
* Sets the context with memoization. Intended to be used by `VirtualizedList`.
*/
function VirtualizedListContextProvider(_ref2) {
	var children = _ref2.children, value = _ref2.value;
	var context = (0, import_react.useMemo)(() => ({
		cellKey: null,
		getScrollMetrics: value.getScrollMetrics,
		horizontal: value.horizontal,
		getOutermostParentListRef: value.getOutermostParentListRef,
		registerAsNestedChild: value.registerAsNestedChild,
		unregisterAsNestedChild: value.unregisterAsNestedChild
	}), [
		value.getScrollMetrics,
		value.horizontal,
		value.getOutermostParentListRef,
		value.registerAsNestedChild,
		value.unregisterAsNestedChild
	]);
	return /*#__PURE__*/ import_react.createElement(VirtualizedListContext.Provider, { value: context }, children);
}
/**
* Sets the `cellKey`. Intended to be used by `VirtualizedList` for each cell.
*/
function VirtualizedListCellContextProvider(_ref3) {
	var cellKey = _ref3.cellKey, children = _ref3.children;
	var currContext = (0, import_react.useContext)(VirtualizedListContext);
	var context = (0, import_react.useMemo)(() => currContext == null ? null : _objectSpread2(_objectSpread2({}, currContext), {}, { cellKey }), [currContext, cellKey]);
	return /*#__PURE__*/ import_react.createElement(VirtualizedListContext.Provider, { value: context }, children);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/VirtualizedListCellRenderer.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var CellRenderer = class extends import_react.Component {
	constructor() {
		super(...arguments);
		this.state = { separatorProps: {
			highlighted: false,
			leadingItem: this.props.item
		} };
		this._separators = {
			highlight: () => {
				var _this$props = this.props, cellKey = _this$props.cellKey, prevCellKey = _this$props.prevCellKey;
				this.props.onUpdateSeparators([cellKey, prevCellKey], { highlighted: true });
			},
			unhighlight: () => {
				var _this$props2 = this.props, cellKey = _this$props2.cellKey, prevCellKey = _this$props2.prevCellKey;
				this.props.onUpdateSeparators([cellKey, prevCellKey], { highlighted: false });
			},
			updateProps: (select, newProps) => {
				var _this$props3 = this.props, cellKey = _this$props3.cellKey, prevCellKey = _this$props3.prevCellKey;
				this.props.onUpdateSeparators([select === "leading" ? prevCellKey : cellKey], newProps);
			}
		};
		this._onLayout = (nativeEvent) => {
			this.props.onCellLayout && this.props.onCellLayout(nativeEvent, this.props.cellKey, this.props.index);
		};
	}
	static getDerivedStateFromProps(props, prevState) {
		return { separatorProps: _objectSpread2(_objectSpread2({}, prevState.separatorProps), {}, { leadingItem: props.item }) };
	}
	updateSeparatorProps(newProps) {
		this.setState((state) => ({ separatorProps: _objectSpread2(_objectSpread2({}, state.separatorProps), newProps) }));
	}
	componentWillUnmount() {
		this.props.onUnmount(this.props.cellKey);
	}
	_renderElement(renderItem, ListItemComponent, item, index) {
		if (renderItem && ListItemComponent) console.warn("VirtualizedList: Both ListItemComponent and renderItem props are present. ListItemComponent will take precedence over renderItem.");
		if (ListItemComponent) return /*#__PURE__*/ import_react.createElement(ListItemComponent, {
			item,
			index,
			separators: this._separators
		});
		if (renderItem) return renderItem({
			item,
			index,
			separators: this._separators
		});
		(0, import_invariant.default)(false, "VirtualizedList: Either ListItemComponent or renderItem props are required but none were found.");
	}
	render() {
		var _this$props4 = this.props, CellRendererComponent = _this$props4.CellRendererComponent, ItemSeparatorComponent = _this$props4.ItemSeparatorComponent, ListItemComponent = _this$props4.ListItemComponent, cellKey = _this$props4.cellKey, horizontal = _this$props4.horizontal, item = _this$props4.item, index = _this$props4.index, inversionStyle = _this$props4.inversionStyle, onCellFocusCapture = _this$props4.onCellFocusCapture, onCellLayout = _this$props4.onCellLayout, renderItem = _this$props4.renderItem;
		var element = this._renderElement(renderItem, ListItemComponent, item, index);
		var itemSeparator = /*#__PURE__*/ import_react.isValidElement(ItemSeparatorComponent) ? ItemSeparatorComponent : ItemSeparatorComponent && /*#__PURE__*/ import_react.createElement(ItemSeparatorComponent, this.state.separatorProps);
		var cellStyle = inversionStyle ? horizontal ? [styles$19.rowReverse, inversionStyle] : [styles$19.columnReverse, inversionStyle] : horizontal ? [styles$19.row, inversionStyle] : inversionStyle;
		var result = !CellRendererComponent ? /*#__PURE__*/ import_react.createElement(View, _extends({
			style: cellStyle,
			onFocusCapture: onCellFocusCapture
		}, onCellLayout && { onLayout: this._onLayout }), element, itemSeparator) : /*#__PURE__*/ import_react.createElement(CellRendererComponent, _extends({
			cellKey,
			index,
			item,
			style: cellStyle,
			onFocusCapture: onCellFocusCapture
		}, onCellLayout && { onLayout: this._onLayout }), element, itemSeparator);
		return /*#__PURE__*/ import_react.createElement(VirtualizedListCellContextProvider, { cellKey: this.props.cellKey }, result);
	}
};
var styles$19 = stylesheet.create({
	row: { flexDirection: "row" },
	rowReverse: { flexDirection: "row-reverse" },
	columnReverse: { flexDirection: "column-reverse" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizeUtils/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* Used to find the indices of the frames that overlap the given offsets. Useful for finding the
* items that bound different windows of content, such as the visible area or the buffered overscan
* area.
*/
function elementsThatOverlapOffsets(offsets, props, getFrameMetrics, zoomScale) {
	if (zoomScale === void 0) zoomScale = 1;
	var itemCount = props.getItemCount(props.data);
	var result = [];
	for (var offsetIndex = 0; offsetIndex < offsets.length; offsetIndex++) {
		var currentOffset = offsets[offsetIndex];
		var left = 0;
		var right = itemCount - 1;
		while (left <= right) {
			var mid = left + (right - left >>> 1);
			var frame = getFrameMetrics(mid, props);
			var scaledOffsetStart = frame.offset * zoomScale;
			var scaledOffsetEnd = (frame.offset + frame.length) * zoomScale;
			if (mid === 0 && currentOffset < scaledOffsetStart || mid !== 0 && currentOffset <= scaledOffsetStart) right = mid - 1;
			else if (currentOffset > scaledOffsetEnd) left = mid + 1;
			else {
				result[offsetIndex] = mid;
				break;
			}
		}
	}
	return result;
}
/**
* Computes the number of elements in the `next` range that are new compared to the `prev` range.
* Handy for calculating how many new items will be rendered when the render window changes so we
* can restrict the number of new items render at once so that content can appear on the screen
* faster.
*/
function newRangeCount(prev, next) {
	return next.last - next.first + 1 - Math.max(0, 1 + Math.min(next.last, prev.last) - Math.max(next.first, prev.first));
}
/**
* Custom logic for determining which items should be rendered given the current frame and scroll
* metrics, as well as the previous render state. The algorithm may evolve over time, but generally
* prioritizes the visible area first, then expands that with overscan regions ahead and behind,
* biased in the direction of scroll.
*/
function computeWindowedRenderLimits(props, maxToRenderPerBatch, windowSize, prev, getFrameMetricsApprox, scrollMetrics) {
	var itemCount = props.getItemCount(props.data);
	if (itemCount === 0) return {
		first: 0,
		last: -1
	};
	var offset = scrollMetrics.offset, velocity = scrollMetrics.velocity, visibleLength = scrollMetrics.visibleLength, _scrollMetrics$zoomSc = scrollMetrics.zoomScale, zoomScale = _scrollMetrics$zoomSc === void 0 ? 1 : _scrollMetrics$zoomSc;
	var visibleBegin = Math.max(0, offset);
	var visibleEnd = visibleBegin + visibleLength;
	var overscanLength = (windowSize - 1) * visibleLength;
	var leadFactor = .5;
	var fillPreference = velocity > 1 ? "after" : velocity < -1 ? "before" : "none";
	var overscanBegin = Math.max(0, visibleBegin - (1 - leadFactor) * overscanLength);
	var overscanEnd = Math.max(0, visibleEnd + leadFactor * overscanLength);
	if (getFrameMetricsApprox(itemCount - 1, props).offset * zoomScale < overscanBegin) return {
		first: Math.max(0, itemCount - 1 - maxToRenderPerBatch),
		last: itemCount - 1
	};
	var _elementsThatOverlapO = elementsThatOverlapOffsets([
		overscanBegin,
		visibleBegin,
		visibleEnd,
		overscanEnd
	], props, getFrameMetricsApprox, zoomScale), overscanFirst = _elementsThatOverlapO[0], first = _elementsThatOverlapO[1], last = _elementsThatOverlapO[2], overscanLast = _elementsThatOverlapO[3];
	overscanFirst = overscanFirst == null ? 0 : overscanFirst;
	first = first == null ? Math.max(0, overscanFirst) : first;
	overscanLast = overscanLast == null ? itemCount - 1 : overscanLast;
	last = last == null ? Math.min(overscanLast, first + maxToRenderPerBatch - 1) : last;
	var visible = {
		first,
		last
	};
	var newCellCount = newRangeCount(prev, visible);
	while (true) {
		if (first <= overscanFirst && last >= overscanLast) break;
		var maxNewCells = newCellCount >= maxToRenderPerBatch;
		var firstWillAddMore = first <= prev.first || first > prev.last;
		var firstShouldIncrement = first > overscanFirst && (!maxNewCells || !firstWillAddMore);
		var lastWillAddMore = last >= prev.last || last < prev.first;
		var lastShouldIncrement = last < overscanLast && (!maxNewCells || !lastWillAddMore);
		if (maxNewCells && !firstShouldIncrement && !lastShouldIncrement) break;
		if (firstShouldIncrement && !(fillPreference === "after" && lastShouldIncrement && lastWillAddMore)) {
			if (firstWillAddMore) newCellCount++;
			first--;
		}
		if (lastShouldIncrement && !(fillPreference === "before" && firstShouldIncrement && firstWillAddMore)) {
			if (lastWillAddMore) newCellCount++;
			last++;
		}
	}
	if (!(last >= first && first >= 0 && last < itemCount && first >= overscanFirst && last <= overscanLast && first <= visible.first && last >= visible.last)) throw new Error("Bad window calculation " + JSON.stringify({
		first,
		last,
		itemCount,
		overscanFirst,
		overscanLast,
		visible
	}));
	return {
		first,
		last
	};
}
function keyExtractor(item, index) {
	if (typeof item === "object" && (item == null ? void 0 : item.key) != null) return item.key;
	if (typeof item === "object" && (item == null ? void 0 : item.id) != null) return item.id;
	return String(index);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var import_nullthrows = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function nullthrows(x, message) {
		if (x != null) return x;
		var error = new Error(message !== void 0 ? message : "Got unexpected " + x);
		error.framesToPop = 1;
		throw error;
	}
	module.exports = nullthrows;
	module.exports.default = nullthrows;
	Object.defineProperty(module.exports, "__esModule", { value: true });
})))());
var __DEV__$2 = true;
var ON_EDGE_REACHED_EPSILON = .001;
var _usedIndexForKey = false;
var _keylessItemComponentName = "";
/**
* Default Props Helper Functions
* Use the following helper functions for default values
*/
function horizontalOrDefault(horizontal) {
	return horizontal !== null && horizontal !== void 0 ? horizontal : false;
}
function initialNumToRenderOrDefault(initialNumToRender) {
	return initialNumToRender !== null && initialNumToRender !== void 0 ? initialNumToRender : 10;
}
function maxToRenderPerBatchOrDefault(maxToRenderPerBatch) {
	return maxToRenderPerBatch !== null && maxToRenderPerBatch !== void 0 ? maxToRenderPerBatch : 10;
}
function onStartReachedThresholdOrDefault(onStartReachedThreshold) {
	return onStartReachedThreshold !== null && onStartReachedThreshold !== void 0 ? onStartReachedThreshold : 2;
}
function onEndReachedThresholdOrDefault(onEndReachedThreshold) {
	return onEndReachedThreshold !== null && onEndReachedThreshold !== void 0 ? onEndReachedThreshold : 2;
}
function getScrollingThreshold(threshold, visibleLength) {
	return threshold * visibleLength / 2;
}
function scrollEventThrottleOrDefault(scrollEventThrottle) {
	return scrollEventThrottle !== null && scrollEventThrottle !== void 0 ? scrollEventThrottle : 50;
}
function windowSizeOrDefault(windowSize) {
	return windowSize !== null && windowSize !== void 0 ? windowSize : 21;
}
function findLastWhere(arr, predicate) {
	for (var i = arr.length - 1; i >= 0; i--) if (predicate(arr[i])) return arr[i];
	return null;
}
/**
* Base implementation for the more convenient [`<FlatList>`](https://reactnative.dev/docs/flatlist)
* and [`<SectionList>`](https://reactnative.dev/docs/sectionlist) components, which are also better
* documented. In general, this should only really be used if you need more flexibility than
* `FlatList` provides, e.g. for use with immutable data instead of plain arrays.
*
* Virtualization massively improves memory consumption and performance of large lists by
* maintaining a finite render window of active items and replacing all items outside of the render
* window with appropriately sized blank space. The window adapts to scrolling behavior, and items
* are rendered incrementally with low-pri (after any running interactions) if they are far from the
* visible area, or with hi-pri otherwise to minimize the potential of seeing blank space.
*
* Some caveats:
*
* - Internal state is not preserved when content scrolls out of the render window. Make sure all
*   your data is captured in the item data or external stores like Flux, Redux, or Relay.
* - This is a `PureComponent` which means that it will not re-render if `props` remain shallow-
*   equal. Make sure that everything your `renderItem` function depends on is passed as a prop
*   (e.g. `extraData`) that is not `===` after updates, otherwise your UI may not update on
*   changes. This includes the `data` prop and parent component state.
* - In order to constrain memory and enable smooth scrolling, content is rendered asynchronously
*   offscreen. This means it's possible to scroll faster than the fill rate ands momentarily see
*   blank content. This is a tradeoff that can be adjusted to suit the needs of each application,
*   and we are working on improving it behind the scenes.
* - By default, the list looks for a `key` or `id` prop on each item and uses that for the React key.
*   Alternatively, you can provide a custom `keyExtractor` prop.
* - As an effort to remove defaultProps, use helper functions when referencing certain props
*
*/
var VirtualizedList = class VirtualizedList extends StateSafePureComponent {
	scrollToEnd(params) {
		var animated = params ? params.animated : true;
		var veryLast = this.props.getItemCount(this.props.data) - 1;
		if (veryLast < 0) return;
		var frame = this.__getFrameMetricsApprox(veryLast, this.props);
		var offset = Math.max(0, frame.offset + frame.length + this._footerLength - this._scrollMetrics.visibleLength);
		if (this._scrollRef == null) return;
		if (this._scrollRef.scrollTo == null) {
			console.warn("No scrollTo method provided. This may be because you have two nested VirtualizedLists with the same orientation, or because you are using a custom component that does not implement scrollTo.");
			return;
		}
		this._scrollRef.scrollTo(horizontalOrDefault(this.props.horizontal) ? {
			x: offset,
			animated
		} : {
			y: offset,
			animated
		});
	}
	scrollToIndex(params) {
		var _this$props = this.props, data = _this$props.data, horizontal = _this$props.horizontal, getItemCount = _this$props.getItemCount, getItemLayout = _this$props.getItemLayout, onScrollToIndexFailed = _this$props.onScrollToIndexFailed;
		var animated = params.animated, index = params.index, viewOffset = params.viewOffset, viewPosition = params.viewPosition;
		(0, import_invariant.default)(index >= 0, "scrollToIndex out of range: requested index " + index + " but minimum is 0");
		(0, import_invariant.default)(getItemCount(data) >= 1, "scrollToIndex out of range: item length " + getItemCount(data) + " but minimum is 1");
		(0, import_invariant.default)(index < getItemCount(data), "scrollToIndex out of range: requested index " + index + " is out of 0 to " + (getItemCount(data) - 1));
		if (!getItemLayout && index > this._highestMeasuredFrameIndex) {
			(0, import_invariant.default)(!!onScrollToIndexFailed, "scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed, otherwise there is no way to know the location of offscreen indices or handle failures.");
			onScrollToIndexFailed({
				averageItemLength: this._averageCellLength,
				highestMeasuredFrameIndex: this._highestMeasuredFrameIndex,
				index
			});
			return;
		}
		var frame = this.__getFrameMetricsApprox(Math.floor(index), this.props);
		var offset = Math.max(0, this._getOffsetApprox(index, this.props) - (viewPosition || 0) * (this._scrollMetrics.visibleLength - frame.length)) - (viewOffset || 0);
		if (this._scrollRef == null) return;
		if (this._scrollRef.scrollTo == null) {
			console.warn("No scrollTo method provided. This may be because you have two nested VirtualizedLists with the same orientation, or because you are using a custom component that does not implement scrollTo.");
			return;
		}
		this._scrollRef.scrollTo(horizontal ? {
			x: offset,
			animated
		} : {
			y: offset,
			animated
		});
	}
	scrollToItem(params) {
		var item = params.item;
		var _this$props2 = this.props, data = _this$props2.data, getItem = _this$props2.getItem, getItemCount = _this$props2.getItemCount;
		var itemCount = getItemCount(data);
		for (var _index = 0; _index < itemCount; _index++) if (getItem(data, _index) === item) {
			this.scrollToIndex(_objectSpread2(_objectSpread2({}, params), {}, { index: _index }));
			break;
		}
	}
	/**
	* Scroll to a specific content pixel offset in the list.
	*
	* Param `offset` expects the offset to scroll to.
	* In case of `horizontal` is true, the offset is the x-value,
	* in any other case the offset is the y-value.
	*
	* Param `animated` (`true` by default) defines whether the list
	* should do an animation while scrolling.
	*/
	scrollToOffset(params) {
		var animated = params.animated, offset = params.offset;
		if (this._scrollRef == null) return;
		if (this._scrollRef.scrollTo == null) {
			console.warn("No scrollTo method provided. This may be because you have two nested VirtualizedLists with the same orientation, or because you are using a custom component that does not implement scrollTo.");
			return;
		}
		this._scrollRef.scrollTo(horizontalOrDefault(this.props.horizontal) ? {
			x: offset,
			animated
		} : {
			y: offset,
			animated
		});
	}
	recordInteraction() {
		this._nestedChildLists.forEach((childList) => {
			childList.recordInteraction();
		});
		this._viewabilityTuples.forEach((t) => {
			t.viewabilityHelper.recordInteraction();
		});
		this._updateViewableItems(this.props, this.state.cellsAroundViewport);
	}
	flashScrollIndicators() {
		if (this._scrollRef == null) return;
		this._scrollRef.flashScrollIndicators();
	}
	/**
	* Provides a handle to the underlying scroll responder.
	* Note that `this._scrollRef` might not be a `ScrollView`, so we
	* need to check that it responds to `getScrollResponder` before calling it.
	*/
	getScrollResponder() {
		if (this._scrollRef && this._scrollRef.getScrollResponder) return this._scrollRef.getScrollResponder();
	}
	getScrollableNode() {
		if (this._scrollRef && this._scrollRef.getScrollableNode) return this._scrollRef.getScrollableNode();
		else return this._scrollRef;
	}
	getScrollRef() {
		if (this._scrollRef && this._scrollRef.getScrollRef) return this._scrollRef.getScrollRef();
		else return this._scrollRef;
	}
	_getCellKey() {
		var _this$context;
		return ((_this$context = this.context) == null ? void 0 : _this$context.cellKey) || "rootList";
	}
	hasMore() {
		return this._hasMore;
	}
	constructor(_props) {
		var _this$props$updateCel;
		super(_props);
		this._getScrollMetrics = () => {
			return this._scrollMetrics;
		};
		this._getOutermostParentListRef = () => {
			if (this._isNestedWithSameOrientation()) return this.context.getOutermostParentListRef();
			else return this;
		};
		this._registerAsNestedChild = (childList) => {
			this._nestedChildLists.add(childList.ref, childList.cellKey);
			if (this._hasInteracted) childList.ref.recordInteraction();
		};
		this._unregisterAsNestedChild = (childList) => {
			this._nestedChildLists.remove(childList.ref);
		};
		this._onUpdateSeparators = (keys, newProps) => {
			keys.forEach((key) => {
				var ref = key != null && this._cellRefs[key];
				ref && ref.updateSeparatorProps(newProps);
			});
		};
		this._getSpacerKey = (isVertical) => isVertical ? "height" : "width";
		this._averageCellLength = 0;
		this._cellRefs = {};
		this._frames = {};
		this._footerLength = 0;
		this._hasTriggeredInitialScrollToIndex = false;
		this._hasInteracted = false;
		this._hasMore = false;
		this._hasWarned = {};
		this._headerLength = 0;
		this._hiPriInProgress = false;
		this._highestMeasuredFrameIndex = 0;
		this._indicesToKeys = /* @__PURE__ */ new Map();
		this._lastFocusedCellKey = null;
		this._nestedChildLists = new ChildListCollection();
		this._offsetFromParentVirtualizedList = 0;
		this._prevParentOffset = 0;
		this._scrollMetrics = {
			contentLength: 0,
			dOffset: 0,
			dt: 10,
			offset: 0,
			timestamp: 0,
			velocity: 0,
			visibleLength: 0,
			zoomScale: 1
		};
		this._scrollRef = null;
		this._sentStartForContentLength = 0;
		this._sentEndForContentLength = 0;
		this._totalCellLength = 0;
		this._totalCellsMeasured = 0;
		this._viewabilityTuples = [];
		this._captureScrollRef = (ref) => {
			this._scrollRef = ref;
		};
		this._defaultRenderScrollComponent = (props) => {
			var onRefresh = props.onRefresh;
			if (this._isNestedWithSameOrientation()) return /*#__PURE__*/ import_react.createElement(View, props);
			else if (onRefresh) {
				var _props$refreshing;
				(0, import_invariant.default)(typeof props.refreshing === "boolean", "`refreshing` prop must be set as a boolean in order to use `onRefresh`, but got `" + JSON.stringify((_props$refreshing = props.refreshing) !== null && _props$refreshing !== void 0 ? _props$refreshing : "undefined") + "`");
				return /*#__PURE__*/ import_react.createElement(ForwardedScrollView, _extends({}, props, { refreshControl: props.refreshControl == null ? /*#__PURE__*/ import_react.createElement(RefreshControl, {
					refreshing: props.refreshing,
					onRefresh,
					progressViewOffset: props.progressViewOffset
				}) : props.refreshControl }));
			} else return /*#__PURE__*/ import_react.createElement(ForwardedScrollView, props);
		};
		this._onCellLayout = (e, cellKey, index) => {
			var layout = e.nativeEvent.layout;
			var next = {
				offset: this._selectOffset(layout),
				length: this._selectLength(layout),
				index,
				inLayout: true
			};
			var curr = this._frames[cellKey];
			if (!curr || next.offset !== curr.offset || next.length !== curr.length || index !== curr.index) {
				this._totalCellLength += next.length - (curr ? curr.length : 0);
				this._totalCellsMeasured += curr ? 0 : 1;
				this._averageCellLength = this._totalCellLength / this._totalCellsMeasured;
				this._frames[cellKey] = next;
				this._highestMeasuredFrameIndex = Math.max(this._highestMeasuredFrameIndex, index);
				this._scheduleCellsToRenderUpdate();
			} else this._frames[cellKey].inLayout = true;
			this._triggerRemeasureForChildListsInCell(cellKey);
			this._computeBlankness();
			this._updateViewableItems(this.props, this.state.cellsAroundViewport);
		};
		this._onCellUnmount = (cellKey) => {
			delete this._cellRefs[cellKey];
			var curr = this._frames[cellKey];
			if (curr) this._frames[cellKey] = _objectSpread2(_objectSpread2({}, curr), {}, { inLayout: false });
		};
		this._onLayout = (e) => {
			if (this._isNestedWithSameOrientation()) this.measureLayoutRelativeToContainingList();
			else this._scrollMetrics.visibleLength = this._selectLength(e.nativeEvent.layout);
			this.props.onLayout && this.props.onLayout(e);
			this._scheduleCellsToRenderUpdate();
			this._maybeCallOnEdgeReached();
		};
		this._onLayoutEmpty = (e) => {
			this.props.onLayout && this.props.onLayout(e);
		};
		this._onLayoutFooter = (e) => {
			this._triggerRemeasureForChildListsInCell(this._getFooterCellKey());
			this._footerLength = this._selectLength(e.nativeEvent.layout);
		};
		this._onLayoutHeader = (e) => {
			this._headerLength = this._selectLength(e.nativeEvent.layout);
		};
		this._onContentSizeChange = (width, height) => {
			if (width > 0 && height > 0 && this.props.initialScrollIndex != null && this.props.initialScrollIndex > 0 && !this._hasTriggeredInitialScrollToIndex) {
				if (this.props.contentOffset == null) {
					if (this.props.initialScrollIndex < this.props.getItemCount(this.props.data)) this.scrollToIndex({
						animated: false,
						index: (0, import_nullthrows.default)(this.props.initialScrollIndex)
					});
					else this.scrollToEnd({ animated: false });
				}
				this._hasTriggeredInitialScrollToIndex = true;
			}
			if (this.props.onContentSizeChange) this.props.onContentSizeChange(width, height);
			this._scrollMetrics.contentLength = this._selectLength({
				height,
				width
			});
			this._scheduleCellsToRenderUpdate();
			this._maybeCallOnEdgeReached();
		};
		this._convertParentScrollMetrics = (metrics) => {
			var offset = metrics.offset - this._offsetFromParentVirtualizedList;
			var visibleLength = metrics.visibleLength;
			var dOffset = offset - this._scrollMetrics.offset;
			return {
				visibleLength,
				contentLength: this._scrollMetrics.contentLength,
				offset,
				dOffset
			};
		};
		this._onScroll = (e) => {
			this._nestedChildLists.forEach((childList) => {
				childList._onScroll(e);
			});
			if (this.props.onScroll) this.props.onScroll(e);
			var timestamp = e.timeStamp;
			var visibleLength = this._selectLength(e.nativeEvent.layoutMeasurement);
			var contentLength = this._selectLength(e.nativeEvent.contentSize);
			var offset = this._selectOffset(e.nativeEvent.contentOffset);
			var dOffset = offset - this._scrollMetrics.offset;
			if (this._isNestedWithSameOrientation()) {
				if (this._scrollMetrics.contentLength === 0) return;
				var _this$_convertParentS = this._convertParentScrollMetrics({
					visibleLength,
					offset
				});
				visibleLength = _this$_convertParentS.visibleLength;
				contentLength = _this$_convertParentS.contentLength;
				offset = _this$_convertParentS.offset;
				dOffset = _this$_convertParentS.dOffset;
			}
			var dt = this._scrollMetrics.timestamp ? Math.max(1, timestamp - this._scrollMetrics.timestamp) : 1;
			var velocity = dOffset / dt;
			if (dt > 500 && this._scrollMetrics.dt > 500 && contentLength > 5 * visibleLength && !this._hasWarned.perf) {
				infoLog("VirtualizedList: You have a large list that is slow to update - make sure your renderItem function renders components that follow React performance best practices like PureComponent, shouldComponentUpdate, etc.", {
					dt,
					prevDt: this._scrollMetrics.dt,
					contentLength
				});
				this._hasWarned.perf = true;
			}
			var zoomScale = e.nativeEvent.zoomScale < 0 ? 1 : e.nativeEvent.zoomScale;
			this._scrollMetrics = {
				contentLength,
				dt,
				dOffset,
				offset,
				timestamp,
				velocity,
				visibleLength,
				zoomScale
			};
			this._updateViewableItems(this.props, this.state.cellsAroundViewport);
			if (!this.props) return;
			this._maybeCallOnEdgeReached();
			if (velocity !== 0) this._fillRateHelper.activate();
			this._computeBlankness();
			this._scheduleCellsToRenderUpdate();
		};
		this._onScrollBeginDrag = (e) => {
			this._nestedChildLists.forEach((childList) => {
				childList._onScrollBeginDrag(e);
			});
			this._viewabilityTuples.forEach((tuple) => {
				tuple.viewabilityHelper.recordInteraction();
			});
			this._hasInteracted = true;
			this.props.onScrollBeginDrag && this.props.onScrollBeginDrag(e);
		};
		this._onScrollEndDrag = (e) => {
			this._nestedChildLists.forEach((childList) => {
				childList._onScrollEndDrag(e);
			});
			var velocity = e.nativeEvent.velocity;
			if (velocity) this._scrollMetrics.velocity = this._selectOffset(velocity);
			this._computeBlankness();
			this.props.onScrollEndDrag && this.props.onScrollEndDrag(e);
		};
		this._onMomentumScrollBegin = (e) => {
			this._nestedChildLists.forEach((childList) => {
				childList._onMomentumScrollBegin(e);
			});
			this.props.onMomentumScrollBegin && this.props.onMomentumScrollBegin(e);
		};
		this._onMomentumScrollEnd = (e) => {
			this._nestedChildLists.forEach((childList) => {
				childList._onMomentumScrollEnd(e);
			});
			this._scrollMetrics.velocity = 0;
			this._computeBlankness();
			this.props.onMomentumScrollEnd && this.props.onMomentumScrollEnd(e);
		};
		this._updateCellsToRender = () => {
			this._updateViewableItems(this.props, this.state.cellsAroundViewport);
			this.setState((state, props) => {
				var cellsAroundViewport = this._adjustCellsAroundViewport(props, state.cellsAroundViewport);
				var renderMask = VirtualizedList._createRenderMask(props, cellsAroundViewport, this._getNonViewportRenderRegions(props));
				if (cellsAroundViewport.first === state.cellsAroundViewport.first && cellsAroundViewport.last === state.cellsAroundViewport.last && renderMask.equals(state.renderMask)) return null;
				return {
					cellsAroundViewport,
					renderMask
				};
			});
		};
		this._createViewToken = (index, isViewable, props) => {
			var data = props.data, getItem = props.getItem;
			var item = getItem(data, index);
			return {
				index,
				item,
				key: this._keyExtractor(item, index, props),
				isViewable
			};
		};
		this._getOffsetApprox = (index, props) => {
			if (Number.isInteger(index)) return this.__getFrameMetricsApprox(index, props).offset;
			else {
				var frameMetrics = this.__getFrameMetricsApprox(Math.floor(index), props);
				var remainder = index - Math.floor(index);
				return frameMetrics.offset + remainder * frameMetrics.length;
			}
		};
		this.__getFrameMetricsApprox = (index, props) => {
			var frame = this._getFrameMetrics(index, props);
			if (frame && frame.index === index) return frame;
			else {
				var data = props.data, getItemCount = props.getItemCount, getItemLayout = props.getItemLayout;
				(0, import_invariant.default)(index >= 0 && index < getItemCount(data), "Tried to get frame for out of range index " + index);
				(0, import_invariant.default)(!getItemLayout, "Should not have to estimate frames when a measurement metrics function is provided");
				return {
					length: this._averageCellLength,
					offset: this._averageCellLength * index
				};
			}
		};
		this._getFrameMetrics = (index, props) => {
			var data = props.data, getItem = props.getItem, getItemCount = props.getItemCount, getItemLayout = props.getItemLayout;
			(0, import_invariant.default)(index >= 0 && index < getItemCount(data), "Tried to get frame for out of range index " + index);
			var item = getItem(data, index);
			var frame = this._frames[this._keyExtractor(item, index, props)];
			if (!frame || frame.index !== index) {
				if (getItemLayout) return getItemLayout(data, index);
			}
			return frame;
		};
		this._getNonViewportRenderRegions = (props) => {
			if (!(this._lastFocusedCellKey && this._cellRefs[this._lastFocusedCellKey])) return [];
			var focusedCellIndex = this._cellRefs[this._lastFocusedCellKey].props.index;
			var itemCount = props.getItemCount(props.data);
			if (focusedCellIndex >= itemCount || this._keyExtractor(props.getItem(props.data, focusedCellIndex), focusedCellIndex, props) !== this._lastFocusedCellKey) return [];
			var first = focusedCellIndex;
			var heightOfCellsBeforeFocused = 0;
			for (var i = first - 1; i >= 0 && heightOfCellsBeforeFocused < this._scrollMetrics.visibleLength; i--) {
				first--;
				heightOfCellsBeforeFocused += this.__getFrameMetricsApprox(i, props).length;
			}
			var last = focusedCellIndex;
			var heightOfCellsAfterFocused = 0;
			for (var _i = last + 1; _i < itemCount && heightOfCellsAfterFocused < this._scrollMetrics.visibleLength; _i++) {
				last++;
				heightOfCellsAfterFocused += this.__getFrameMetricsApprox(_i, props).length;
			}
			return [{
				first,
				last
			}];
		};
		this._checkProps(_props);
		this._fillRateHelper = new FillRateHelper(this._getFrameMetrics);
		this._updateCellsToRenderBatcher = new Batchinator(this._updateCellsToRender, (_this$props$updateCel = this.props.updateCellsBatchingPeriod) !== null && _this$props$updateCel !== void 0 ? _this$props$updateCel : 50);
		if (this.props.viewabilityConfigCallbackPairs) this._viewabilityTuples = this.props.viewabilityConfigCallbackPairs.map((pair) => ({
			viewabilityHelper: new ViewabilityHelper(pair.viewabilityConfig),
			onViewableItemsChanged: pair.onViewableItemsChanged
		}));
		else {
			var _this$props3 = this.props, onViewableItemsChanged = _this$props3.onViewableItemsChanged, viewabilityConfig = _this$props3.viewabilityConfig;
			if (onViewableItemsChanged) this._viewabilityTuples.push({
				viewabilityHelper: new ViewabilityHelper(viewabilityConfig),
				onViewableItemsChanged
			});
		}
		var initialRenderRegion = VirtualizedList._initialRenderRegion(_props);
		this.state = {
			cellsAroundViewport: initialRenderRegion,
			renderMask: VirtualizedList._createRenderMask(_props, initialRenderRegion)
		};
		this.invertedWheelEventHandler = (ev) => {
			var scrollOffset = this.props.horizontal ? ev.target.scrollLeft : ev.target.scrollTop;
			var scrollLength = this.props.horizontal ? ev.target.scrollWidth : ev.target.scrollHeight;
			var clientLength = this.props.horizontal ? ev.target.clientWidth : ev.target.clientHeight;
			var isEventTargetScrollable = scrollLength > clientLength;
			var delta = this.props.horizontal ? ev.deltaX || ev.wheelDeltaX : ev.deltaY || ev.wheelDeltaY;
			var leftoverDelta = delta;
			if (isEventTargetScrollable) leftoverDelta = delta < 0 ? Math.min(delta + scrollOffset, 0) : Math.max(delta - (scrollLength - clientLength - scrollOffset), 0);
			var targetDelta = delta - leftoverDelta;
			if (this.props.inverted && this._scrollRef && this._scrollRef.getScrollableNode) {
				var node = this._scrollRef.getScrollableNode();
				if (this.props.horizontal) {
					ev.target.scrollLeft += targetDelta;
					var nextScrollLeft = node.scrollLeft - leftoverDelta;
					node.scrollLeft = !this.props.getItemLayout ? Math.min(nextScrollLeft, this._totalCellLength) : nextScrollLeft;
				} else {
					ev.target.scrollTop += targetDelta;
					var nextScrollTop = node.scrollTop - leftoverDelta;
					node.scrollTop = !this.props.getItemLayout ? Math.min(nextScrollTop, this._totalCellLength) : nextScrollTop;
				}
				ev.preventDefault();
			}
		};
	}
	_checkProps(props) {
		var onScroll = props.onScroll, windowSize = props.windowSize, getItemCount = props.getItemCount, data = props.data, initialScrollIndex = props.initialScrollIndex;
		(0, import_invariant.default)(!onScroll || !onScroll.__isNative, "Components based on VirtualizedList must be wrapped with Animated.createAnimatedComponent to support native onScroll events with useNativeDriver");
		(0, import_invariant.default)(windowSizeOrDefault(windowSize) > 0, "VirtualizedList: The windowSize prop must be present and set to a value greater than 0.");
		(0, import_invariant.default)(getItemCount, "VirtualizedList: The \"getItemCount\" prop must be provided");
		var itemCount = getItemCount(data);
		if (initialScrollIndex != null && !this._hasTriggeredInitialScrollToIndex && (initialScrollIndex < 0 || itemCount > 0 && initialScrollIndex >= itemCount) && !this._hasWarned.initialScrollIndex) {
			console.warn("initialScrollIndex \"" + initialScrollIndex + "\" is not valid (list has " + itemCount + " items)");
			this._hasWarned.initialScrollIndex = true;
		}
		if (__DEV__$2 && !this._hasWarned.flexWrap) {
			var flatStyles = stylesheet.flatten(this.props.contentContainerStyle);
			if (flatStyles != null && flatStyles.flexWrap === "wrap") {
				console.warn("`flexWrap: `wrap`` is not supported with the `VirtualizedList` components.Consider using `numColumns` with `FlatList` instead.");
				this._hasWarned.flexWrap = true;
			}
		}
	}
	static _createRenderMask(props, cellsAroundViewport, additionalRegions) {
		var itemCount = props.getItemCount(props.data);
		(0, import_invariant.default)(cellsAroundViewport.first >= 0 && cellsAroundViewport.last >= cellsAroundViewport.first - 1 && cellsAroundViewport.last < itemCount, "Invalid cells around viewport \"[" + cellsAroundViewport.first + ", " + cellsAroundViewport.last + "]\" was passed to VirtualizedList._createRenderMask");
		var renderMask = new CellRenderMask(itemCount);
		if (itemCount > 0) {
			var allRegions = [cellsAroundViewport, ...additionalRegions !== null && additionalRegions !== void 0 ? additionalRegions : []];
			for (var _i2 = 0, _allRegions = allRegions; _i2 < _allRegions.length; _i2++) {
				var region = _allRegions[_i2];
				renderMask.addCells(region);
			}
			if (props.initialScrollIndex == null || props.initialScrollIndex <= 0) {
				var initialRegion = VirtualizedList._initialRenderRegion(props);
				renderMask.addCells(initialRegion);
			}
			var stickyIndicesSet = new Set(props.stickyHeaderIndices);
			VirtualizedList._ensureClosestStickyHeader(props, stickyIndicesSet, renderMask, cellsAroundViewport.first);
		}
		return renderMask;
	}
	static _initialRenderRegion(props) {
		var _props$initialScrollI;
		var itemCount = props.getItemCount(props.data);
		var firstCellIndex = Math.max(0, Math.min(itemCount - 1, Math.floor((_props$initialScrollI = props.initialScrollIndex) !== null && _props$initialScrollI !== void 0 ? _props$initialScrollI : 0)));
		return {
			first: firstCellIndex,
			last: Math.min(itemCount, firstCellIndex + initialNumToRenderOrDefault(props.initialNumToRender)) - 1
		};
	}
	static _ensureClosestStickyHeader(props, stickyIndicesSet, renderMask, cellIdx) {
		var stickyOffset = props.ListHeaderComponent ? 1 : 0;
		for (var itemIdx = cellIdx - 1; itemIdx >= 0; itemIdx--) if (stickyIndicesSet.has(itemIdx + stickyOffset)) {
			renderMask.addCells({
				first: itemIdx,
				last: itemIdx
			});
			break;
		}
	}
	_adjustCellsAroundViewport(props, cellsAroundViewport) {
		var data = props.data, getItemCount = props.getItemCount;
		var onEndReachedThreshold = onEndReachedThresholdOrDefault(props.onEndReachedThreshold);
		var _this$_scrollMetrics = this._scrollMetrics, contentLength = _this$_scrollMetrics.contentLength, offset = _this$_scrollMetrics.offset, visibleLength = _this$_scrollMetrics.visibleLength;
		var distanceFromEnd = contentLength - visibleLength - offset;
		if (visibleLength <= 0 || contentLength <= 0) return cellsAroundViewport.last >= getItemCount(data) ? VirtualizedList._constrainToItemCount(cellsAroundViewport, props) : cellsAroundViewport;
		var newCellsAroundViewport;
		if (props.disableVirtualization) {
			var renderAhead = distanceFromEnd < onEndReachedThreshold * visibleLength ? maxToRenderPerBatchOrDefault(props.maxToRenderPerBatch) : 0;
			newCellsAroundViewport = {
				first: 0,
				last: Math.min(cellsAroundViewport.last + renderAhead, getItemCount(data) - 1)
			};
		} else {
			if (props.initialScrollIndex && !this._scrollMetrics.offset && Math.abs(distanceFromEnd) >= Number.EPSILON) return cellsAroundViewport.last >= getItemCount(data) ? VirtualizedList._constrainToItemCount(cellsAroundViewport, props) : cellsAroundViewport;
			newCellsAroundViewport = computeWindowedRenderLimits(props, maxToRenderPerBatchOrDefault(props.maxToRenderPerBatch), windowSizeOrDefault(props.windowSize), cellsAroundViewport, this.__getFrameMetricsApprox, this._scrollMetrics);
			(0, import_invariant.default)(newCellsAroundViewport.last < getItemCount(data), "computeWindowedRenderLimits() should return range in-bounds");
		}
		if (this._nestedChildLists.size() > 0) {
			var childIdx = this._findFirstChildWithMore(newCellsAroundViewport.first, newCellsAroundViewport.last);
			newCellsAroundViewport.last = childIdx !== null && childIdx !== void 0 ? childIdx : newCellsAroundViewport.last;
		}
		return newCellsAroundViewport;
	}
	_findFirstChildWithMore(first, last) {
		for (var ii = first; ii <= last; ii++) {
			var cellKeyForIndex = this._indicesToKeys.get(ii);
			if (cellKeyForIndex != null && this._nestedChildLists.anyInCell(cellKeyForIndex, (childList) => childList.hasMore())) return ii;
		}
		return null;
	}
	componentDidMount() {
		if (this._isNestedWithSameOrientation()) this.context.registerAsNestedChild({
			ref: this,
			cellKey: this.context.cellKey
		});
		this.setupWebWheelHandler();
	}
	componentWillUnmount() {
		if (this._isNestedWithSameOrientation()) this.context.unregisterAsNestedChild({ ref: this });
		this._updateCellsToRenderBatcher.dispose({ abort: true });
		this._viewabilityTuples.forEach((tuple) => {
			tuple.viewabilityHelper.dispose();
		});
		this._fillRateHelper.deactivateAndFlush();
		this.teardownWebWheelHandler();
	}
	setupWebWheelHandler() {
		if (this._scrollRef && this._scrollRef.getScrollableNode) this._scrollRef.getScrollableNode().addEventListener("wheel", this.invertedWheelEventHandler);
		else {
			setTimeout(() => this.setupWebWheelHandler(), 50);
			return;
		}
	}
	teardownWebWheelHandler() {
		if (this._scrollRef && this._scrollRef.getScrollableNode) this._scrollRef.getScrollableNode().removeEventListener("wheel", this.invertedWheelEventHandler);
	}
	static getDerivedStateFromProps(newProps, prevState) {
		if (newProps.getItemCount(newProps.data) === prevState.renderMask.numCells()) return prevState;
		var constrainedCells = VirtualizedList._constrainToItemCount(prevState.cellsAroundViewport, newProps);
		return {
			cellsAroundViewport: constrainedCells,
			renderMask: VirtualizedList._createRenderMask(newProps, constrainedCells)
		};
	}
	_pushCells(cells, stickyHeaderIndices, stickyIndicesFromProps, first, last, inversionStyle) {
		var _this = this;
		var _this$props4 = this.props, CellRendererComponent = _this$props4.CellRendererComponent, ItemSeparatorComponent = _this$props4.ItemSeparatorComponent, ListHeaderComponent = _this$props4.ListHeaderComponent, ListItemComponent = _this$props4.ListItemComponent, data = _this$props4.data, debug = _this$props4.debug, getItem = _this$props4.getItem, getItemCount = _this$props4.getItemCount, getItemLayout = _this$props4.getItemLayout, horizontal = _this$props4.horizontal, renderItem = _this$props4.renderItem;
		var stickyOffset = ListHeaderComponent ? 1 : 0;
		var end = getItemCount(data) - 1;
		var prevCellKey;
		last = Math.min(end, last);
		var _loop = function _loop() {
			var item = getItem(data, ii);
			var key = _this._keyExtractor(item, ii, _this.props);
			_this._indicesToKeys.set(ii, key);
			if (stickyIndicesFromProps.has(ii + stickyOffset)) stickyHeaderIndices.push(cells.length);
			var shouldListenForLayout = getItemLayout == null || debug || _this._fillRateHelper.enabled();
			cells.push(/*#__PURE__*/ import_react.createElement(CellRenderer, _extends({
				CellRendererComponent,
				ItemSeparatorComponent: ii < end ? ItemSeparatorComponent : void 0,
				ListItemComponent,
				cellKey: key,
				horizontal,
				index: ii,
				inversionStyle,
				item,
				key,
				prevCellKey,
				onUpdateSeparators: _this._onUpdateSeparators,
				onCellFocusCapture: (e) => _this._onCellFocusCapture(key),
				onUnmount: _this._onCellUnmount,
				ref: (_ref) => {
					_this._cellRefs[key] = _ref;
				},
				renderItem
			}, shouldListenForLayout && { onCellLayout: _this._onCellLayout })));
			prevCellKey = key;
		};
		for (var ii = first; ii <= last; ii++) _loop();
	}
	static _constrainToItemCount(cells, props) {
		var itemCount = props.getItemCount(props.data);
		var last = Math.min(itemCount - 1, cells.last);
		var maxToRenderPerBatch = maxToRenderPerBatchOrDefault(props.maxToRenderPerBatch);
		return {
			first: clamp(0, itemCount - 1 - maxToRenderPerBatch, cells.first),
			last
		};
	}
	_isNestedWithSameOrientation() {
		var nestedContext = this.context;
		return !!(nestedContext && !!nestedContext.horizontal === horizontalOrDefault(this.props.horizontal));
	}
	_keyExtractor(item, index, props) {
		if (props.keyExtractor != null) return props.keyExtractor(item, index);
		var key = keyExtractor(item, index);
		if (key === String(index)) {
			_usedIndexForKey = true;
			if (item.type && item.type.displayName) _keylessItemComponentName = item.type.displayName;
		}
		return key;
	}
	render() {
		this._checkProps(this.props);
		var _this$props5 = this.props, ListEmptyComponent = _this$props5.ListEmptyComponent, ListFooterComponent = _this$props5.ListFooterComponent, ListHeaderComponent = _this$props5.ListHeaderComponent;
		var _this$props6 = this.props, data = _this$props6.data, horizontal = _this$props6.horizontal;
		var inversionStyle = this.props.inverted ? horizontalOrDefault(this.props.horizontal) ? styles$18.horizontallyInverted : styles$18.verticallyInverted : null;
		var cells = [];
		var stickyIndicesFromProps = new Set(this.props.stickyHeaderIndices);
		var stickyHeaderIndices = [];
		if (ListHeaderComponent) {
			if (stickyIndicesFromProps.has(0)) stickyHeaderIndices.push(0);
			var _element = /*#__PURE__*/ import_react.isValidElement(ListHeaderComponent) ? ListHeaderComponent : /*#__PURE__*/ import_react.createElement(ListHeaderComponent, null);
			cells.push(/*#__PURE__*/ import_react.createElement(VirtualizedListCellContextProvider, {
				cellKey: this._getCellKey() + "-header",
				key: "$header"
			}, /*#__PURE__*/ import_react.createElement(View, {
				onLayout: this._onLayoutHeader,
				style: [inversionStyle, this.props.ListHeaderComponentStyle]
			}, _element)));
		}
		var itemCount = this.props.getItemCount(data);
		if (itemCount === 0 && ListEmptyComponent) {
			var _element2 = /*#__PURE__*/ import_react.isValidElement(ListEmptyComponent) ? ListEmptyComponent : /*#__PURE__*/ import_react.createElement(ListEmptyComponent, null);
			cells.push(/*#__PURE__*/ import_react.createElement(VirtualizedListCellContextProvider, {
				cellKey: this._getCellKey() + "-empty",
				key: "$empty"
			}, /*#__PURE__*/ import_react.cloneElement(_element2, {
				onLayout: (event) => {
					this._onLayoutEmpty(event);
					if (_element2.props.onLayout) _element2.props.onLayout(event);
				},
				style: [inversionStyle, _element2.props.style]
			})));
		}
		if (itemCount > 0) {
			_usedIndexForKey = false;
			_keylessItemComponentName = "";
			var spacerKey = this._getSpacerKey(!horizontal);
			var renderRegions = this.state.renderMask.enumerateRegions();
			var lastSpacer = findLastWhere(renderRegions, (r) => r.isSpacer);
			for (var _iterator = _createForOfIteratorHelperLoose(renderRegions), _step; !(_step = _iterator()).done;) {
				var section = _step.value;
				if (section.isSpacer) {
					if (this.props.disableVirtualization) continue;
					var last = section === lastSpacer && !this.props.getItemLayout ? clamp(section.first - 1, section.last, this._highestMeasuredFrameIndex) : section.last;
					var firstMetrics = this.__getFrameMetricsApprox(section.first, this.props);
					var lastMetrics = this.__getFrameMetricsApprox(last, this.props);
					var spacerSize = lastMetrics.offset + lastMetrics.length - firstMetrics.offset;
					cells.push(/*#__PURE__*/ import_react.createElement(View, {
						key: "$spacer-" + section.first,
						style: { [spacerKey]: spacerSize }
					}));
				} else this._pushCells(cells, stickyHeaderIndices, stickyIndicesFromProps, section.first, section.last, inversionStyle);
			}
			if (!this._hasWarned.keys && _usedIndexForKey) {
				console.warn("VirtualizedList: missing keys for items, make sure to specify a key or id property on each item or provide a custom keyExtractor.", _keylessItemComponentName);
				this._hasWarned.keys = true;
			}
		}
		if (ListFooterComponent) {
			var _element3 = /*#__PURE__*/ import_react.isValidElement(ListFooterComponent) ? ListFooterComponent : /*#__PURE__*/ import_react.createElement(ListFooterComponent, null);
			cells.push(/*#__PURE__*/ import_react.createElement(VirtualizedListCellContextProvider, {
				cellKey: this._getFooterCellKey(),
				key: "$footer"
			}, /*#__PURE__*/ import_react.createElement(View, {
				onLayout: this._onLayoutFooter,
				style: [inversionStyle, this.props.ListFooterComponentStyle]
			}, _element3)));
		}
		var scrollProps = _objectSpread2(_objectSpread2({}, this.props), {}, {
			onContentSizeChange: this._onContentSizeChange,
			onLayout: this._onLayout,
			onScroll: this._onScroll,
			onScrollBeginDrag: this._onScrollBeginDrag,
			onScrollEndDrag: this._onScrollEndDrag,
			onMomentumScrollBegin: this._onMomentumScrollBegin,
			onMomentumScrollEnd: this._onMomentumScrollEnd,
			scrollEventThrottle: scrollEventThrottleOrDefault(this.props.scrollEventThrottle),
			invertStickyHeaders: this.props.invertStickyHeaders !== void 0 ? this.props.invertStickyHeaders : this.props.inverted,
			stickyHeaderIndices,
			style: inversionStyle ? [inversionStyle, this.props.style] : this.props.style
		});
		this._hasMore = this.state.cellsAroundViewport.last < itemCount - 1;
		var ret = /* @__PURE__ */ import_react.createElement(VirtualizedListContextProvider, { value: {
			cellKey: null,
			getScrollMetrics: this._getScrollMetrics,
			horizontal: horizontalOrDefault(this.props.horizontal),
			getOutermostParentListRef: this._getOutermostParentListRef,
			registerAsNestedChild: this._registerAsNestedChild,
			unregisterAsNestedChild: this._unregisterAsNestedChild
		} }, /*#__PURE__*/ import_react.cloneElement((this.props.renderScrollComponent || this._defaultRenderScrollComponent)(scrollProps), { ref: this._captureScrollRef }, cells));
		if (this.props.debug) return /*#__PURE__*/ import_react.createElement(View, { style: styles$18.debug }, ret, this._renderDebugOverlay());
		else return ret;
	}
	componentDidUpdate(prevProps) {
		var _this$props7 = this.props, data = _this$props7.data, extraData = _this$props7.extraData;
		if (data !== prevProps.data || extraData !== prevProps.extraData) this._viewabilityTuples.forEach((tuple) => {
			tuple.viewabilityHelper.resetViewableIndices();
		});
		var hiPriInProgress = this._hiPriInProgress;
		this._scheduleCellsToRenderUpdate();
		if (hiPriInProgress) this._hiPriInProgress = false;
	}
	_computeBlankness() {
		this._fillRateHelper.computeBlankness(this.props, this.state.cellsAroundViewport, this._scrollMetrics);
	}
	_onCellFocusCapture(cellKey) {
		this._lastFocusedCellKey = cellKey;
		this._updateCellsToRender();
	}
	_triggerRemeasureForChildListsInCell(cellKey) {
		this._nestedChildLists.forEachInCell(cellKey, (childList) => {
			childList.measureLayoutRelativeToContainingList();
		});
	}
	measureLayoutRelativeToContainingList() {
		try {
			if (!this._scrollRef) return;
			this._scrollRef.measureLayout(this.context.getOutermostParentListRef().getScrollRef(), (x, y, width, height) => {
				this._offsetFromParentVirtualizedList = this._selectOffset({
					x,
					y
				});
				this._scrollMetrics.contentLength = this._selectLength({
					width,
					height
				});
				var scrollMetrics = this._convertParentScrollMetrics(this.context.getScrollMetrics());
				if (this._scrollMetrics.visibleLength !== scrollMetrics.visibleLength || this._scrollMetrics.offset !== scrollMetrics.offset) {
					this._scrollMetrics.visibleLength = scrollMetrics.visibleLength;
					this._scrollMetrics.offset = scrollMetrics.offset;
					this._nestedChildLists.forEach((childList) => {
						childList.measureLayoutRelativeToContainingList();
					});
				}
			}, (error) => {
				console.warn("VirtualizedList: Encountered an error while measuring a list's offset from its containing VirtualizedList.");
			});
		} catch (error) {
			console.warn("measureLayoutRelativeToContainingList threw an error", error.stack);
		}
	}
	_getFooterCellKey() {
		return this._getCellKey() + "-footer";
	}
	_renderDebugOverlay() {
		var normalize = this._scrollMetrics.visibleLength / (this._scrollMetrics.contentLength || 1);
		var framesInLayout = [];
		var itemCount = this.props.getItemCount(this.props.data);
		for (var ii = 0; ii < itemCount; ii++) {
			var frame = this.__getFrameMetricsApprox(ii, this.props);
			if (frame.inLayout) framesInLayout.push(frame);
		}
		var windowTop = this.__getFrameMetricsApprox(this.state.cellsAroundViewport.first, this.props).offset;
		var frameLast = this.__getFrameMetricsApprox(this.state.cellsAroundViewport.last, this.props);
		var windowLen = frameLast.offset + frameLast.length - windowTop;
		var visTop = this._scrollMetrics.offset;
		var visLen = this._scrollMetrics.visibleLength;
		return /*#__PURE__*/ import_react.createElement(View, { style: [styles$18.debugOverlayBase, styles$18.debugOverlay] }, framesInLayout.map((f, ii) => /*#__PURE__*/ import_react.createElement(View, {
			key: "f" + ii,
			style: [
				styles$18.debugOverlayBase,
				styles$18.debugOverlayFrame,
				{
					top: f.offset * normalize,
					height: f.length * normalize
				}
			]
		})), /*#__PURE__*/ import_react.createElement(View, { style: [
			styles$18.debugOverlayBase,
			styles$18.debugOverlayFrameLast,
			{
				top: windowTop * normalize,
				height: windowLen * normalize
			}
		] }), /*#__PURE__*/ import_react.createElement(View, { style: [
			styles$18.debugOverlayBase,
			styles$18.debugOverlayFrameVis,
			{
				top: visTop * normalize,
				height: visLen * normalize
			}
		] }));
	}
	_selectLength(metrics) {
		return !horizontalOrDefault(this.props.horizontal) ? metrics.height : metrics.width;
	}
	_selectOffset(metrics) {
		return !horizontalOrDefault(this.props.horizontal) ? metrics.y : metrics.x;
	}
	_maybeCallOnEdgeReached() {
		var _this$props8 = this.props, data = _this$props8.data, getItemCount = _this$props8.getItemCount, onStartReached = _this$props8.onStartReached, onStartReachedThreshold = _this$props8.onStartReachedThreshold, onEndReached = _this$props8.onEndReached, onEndReachedThreshold = _this$props8.onEndReachedThreshold, initialScrollIndex = _this$props8.initialScrollIndex;
		var _this$_scrollMetrics2 = this._scrollMetrics, contentLength = _this$_scrollMetrics2.contentLength, visibleLength = _this$_scrollMetrics2.visibleLength, offset = _this$_scrollMetrics2.offset;
		var distanceFromStart = offset;
		var distanceFromEnd = contentLength - visibleLength - offset;
		if (distanceFromStart < ON_EDGE_REACHED_EPSILON) distanceFromStart = 0;
		if (distanceFromEnd < ON_EDGE_REACHED_EPSILON) distanceFromEnd = 0;
		var DEFAULT_THRESHOLD_PX = 2;
		var startThreshold = onStartReachedThreshold != null ? onStartReachedThreshold * visibleLength : DEFAULT_THRESHOLD_PX;
		var endThreshold = onEndReachedThreshold != null ? onEndReachedThreshold * visibleLength : DEFAULT_THRESHOLD_PX;
		var isWithinStartThreshold = distanceFromStart <= startThreshold;
		var isWithinEndThreshold = distanceFromEnd <= endThreshold;
		if (onEndReached && this.state.cellsAroundViewport.last === getItemCount(data) - 1 && isWithinEndThreshold && this._scrollMetrics.contentLength !== this._sentEndForContentLength) {
			this._sentEndForContentLength = this._scrollMetrics.contentLength;
			onEndReached({ distanceFromEnd });
		} else if (onStartReached != null && this.state.cellsAroundViewport.first === 0 && isWithinStartThreshold && this._scrollMetrics.contentLength !== this._sentStartForContentLength) {
			if (!initialScrollIndex || this._scrollMetrics.timestamp !== 0) {
				this._sentStartForContentLength = this._scrollMetrics.contentLength;
				onStartReached({ distanceFromStart });
			}
		} else {
			this._sentStartForContentLength = isWithinStartThreshold ? this._sentStartForContentLength : 0;
			this._sentEndForContentLength = isWithinEndThreshold ? this._sentEndForContentLength : 0;
		}
	}
	_scheduleCellsToRenderUpdate() {
		var _this$state$cellsArou = this.state.cellsAroundViewport, first = _this$state$cellsArou.first, last = _this$state$cellsArou.last;
		var _this$_scrollMetrics3 = this._scrollMetrics, offset = _this$_scrollMetrics3.offset, visibleLength = _this$_scrollMetrics3.visibleLength, velocity = _this$_scrollMetrics3.velocity;
		var itemCount = this.props.getItemCount(this.props.data);
		var hiPri = false;
		var onStartReachedThreshold = onStartReachedThresholdOrDefault(this.props.onStartReachedThreshold);
		var onEndReachedThreshold = onEndReachedThresholdOrDefault(this.props.onEndReachedThreshold);
		if (first > 0) {
			var distTop = offset - this.__getFrameMetricsApprox(first, this.props).offset;
			hiPri = distTop < 0 || velocity < -2 && distTop < getScrollingThreshold(onStartReachedThreshold, visibleLength);
		}
		if (!hiPri && last >= 0 && last < itemCount - 1) {
			var distBottom = this.__getFrameMetricsApprox(last, this.props).offset - (offset + visibleLength);
			hiPri = distBottom < 0 || velocity > 2 && distBottom < getScrollingThreshold(onEndReachedThreshold, visibleLength);
		}
		if (hiPri && (this._averageCellLength || this.props.getItemLayout) && !this._hiPriInProgress) {
			this._hiPriInProgress = true;
			this._updateCellsToRenderBatcher.dispose({ abort: true });
			this._updateCellsToRender();
			return;
		} else this._updateCellsToRenderBatcher.schedule();
	}
	/**
	* Gets an approximate offset to an item at a given index. Supports
	* fractional indices.
	*/
	_updateViewableItems(props, cellsAroundViewport) {
		this._viewabilityTuples.forEach((tuple) => {
			tuple.viewabilityHelper.onUpdate(props, this._scrollMetrics.offset, this._scrollMetrics.visibleLength, this._getFrameMetrics, this._createViewToken, tuple.onViewableItemsChanged, cellsAroundViewport);
		});
	}
};
VirtualizedList.contextType = VirtualizedListContext;
var styles$18 = stylesheet.create({
	verticallyInverted: { transform: "scaleY(-1)" },
	horizontallyInverted: { transform: "scaleX(-1)" },
	debug: { flex: 1 },
	debugOverlayBase: {
		position: "absolute",
		top: 0,
		right: 0
	},
	debugOverlay: {
		bottom: 0,
		width: 20,
		borderColor: "blue",
		borderWidth: 1
	},
	debugOverlayFrame: {
		left: 0,
		backgroundColor: "orange"
	},
	debugOverlayFrameLast: {
		left: 0,
		borderColor: "green",
		borderWidth: 2
	},
	debugOverlayFrameVis: {
		left: 0,
		borderColor: "red",
		borderWidth: 2
	}
});
//#endregion
//#region ../../../../node_modules/.pnpm/memoize-one@6.0.0/node_modules/memoize-one/dist/memoize-one.esm.js
var safeIsNaN = Number.isNaN || function ponyfill(value) {
	return typeof value === "number" && value !== value;
};
function isEqual(first, second) {
	if (first === second) return true;
	if (safeIsNaN(first) && safeIsNaN(second)) return true;
	return false;
}
function areInputsEqual(newInputs, lastInputs) {
	if (newInputs.length !== lastInputs.length) return false;
	for (var i = 0; i < newInputs.length; i++) if (!isEqual(newInputs[i], lastInputs[i])) return false;
	return true;
}
function memoizeOne(resultFn, isEqual) {
	if (isEqual === void 0) isEqual = areInputsEqual;
	var cache = null;
	function memoized() {
		var newArgs = [];
		for (var _i = 0; _i < arguments.length; _i++) newArgs[_i] = arguments[_i];
		if (cache && cache.lastThis === this && isEqual(newArgs, cache.lastArgs)) return cache.lastResult;
		var lastResult = resultFn.apply(this, newArgs);
		cache = {
			lastResult,
			lastArgs: newArgs,
			lastThis: this
		};
		return lastResult;
	}
	memoized.clear = function clear() {
		cache = null;
	};
	return memoized;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/FlatList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$19 = [
	"numColumns",
	"columnWrapperStyle",
	"removeClippedSubviews",
	"strictMode"
];
/**
* Default Props Helper Functions
* Use the following helper functions for default values
*/
function removeClippedSubviewsOrDefault(removeClippedSubviews) {
	return removeClippedSubviews !== null && removeClippedSubviews !== void 0 ? removeClippedSubviews : Platform.OS === "android";
}
function numColumnsOrDefault(numColumns) {
	return numColumns !== null && numColumns !== void 0 ? numColumns : 1;
}
function isArrayLike(data) {
	return typeof Object(data).length === "number";
}
/**
* A performant interface for rendering simple, flat lists, supporting the most handy features:
*
*  - Fully cross-platform.
*  - Optional horizontal mode.
*  - Configurable viewability callbacks.
*  - Header support.
*  - Footer support.
*  - Separator support.
*  - Pull to Refresh.
*  - Scroll loading.
*  - ScrollToIndex support.
*
* If you need section support, use [`<SectionList>`](docs/sectionlist.html).
*
* Minimal Example:
*
*     <FlatList
*       data={[{key: 'a'}, {key: 'b'}]}
*       renderItem={({item}) => <Text>{item.key}</Text>}
*     />
*
* More complex, multi-select example demonstrating `PureComponent` usage for perf optimization and avoiding bugs.
*
* - By binding the `onPressItem` handler, the props will remain `===` and `PureComponent` will
*   prevent wasteful re-renders unless the actual `id`, `selected`, or `title` props change, even
*   if the components rendered in `MyListItem` did not have such optimizations.
* - By passing `extraData={this.state}` to `FlatList` we make sure `FlatList` itself will re-render
*   when the `state.selected` changes. Without setting this prop, `FlatList` would not know it
*   needs to re-render any items because it is also a `PureComponent` and the prop comparison will
*   not show any changes.
* - `keyExtractor` tells the list to use the `id`s for the react keys instead of the default `key` property.
*
*
*     class MyListItem extends React.PureComponent {
*       _onPress = () => {
*         this.props.onPressItem(this.props.id);
*       };
*
*       render() {
*         const textColor = this.props.selected ? "red" : "black";
*         return (
*           <TouchableOpacity onPress={this._onPress}>
*             <View>
*               <Text style={{ color: textColor }}>
*                 {this.props.title}
*               </Text>
*             </View>
*           </TouchableOpacity>
*         );
*       }
*     }
*
*     class MultiSelectList extends React.PureComponent {
*       state = {selected: (new Map(): Map<string, boolean>)};
*
*       _keyExtractor = (item, index) => item.id;
*
*       _onPressItem = (id: string) => {
*         // updater functions are preferred for transactional updates
*         this.setState((state) => {
*           // copy the map rather than modifying state.
*           const selected = new Map(state.selected);
*           selected.set(id, !selected.get(id)); // toggle
*           return {selected};
*         });
*       };
*
*       _renderItem = ({item}) => (
*         <MyListItem
*           id={item.id}
*           onPressItem={this._onPressItem}
*           selected={!!this.state.selected.get(item.id)}
*           title={item.title}
*         />
*       );
*
*       render() {
*         return (
*           <FlatList
*             data={this.props.data}
*             extraData={this.state}
*             keyExtractor={this._keyExtractor}
*             renderItem={this._renderItem}
*           />
*         );
*       }
*     }
*
* This is a convenience wrapper around [`<VirtualizedList>`](docs/virtualizedlist.html),
* and thus inherits its props (as well as those of `ScrollView`) that aren't explicitly listed
* here, along with the following caveats:
*
* - Internal state is not preserved when content scrolls out of the render window. Make sure all
*   your data is captured in the item data or external stores like Flux, Redux, or Relay.
* - This is a `PureComponent` which means that it will not re-render if `props` remain shallow-
*   equal. Make sure that everything your `renderItem` function depends on is passed as a prop
*   (e.g. `extraData`) that is not `===` after updates, otherwise your UI may not update on
*   changes. This includes the `data` prop and parent component state.
* - In order to constrain memory and enable smooth scrolling, content is rendered asynchronously
*   offscreen. This means it's possible to scroll faster than the fill rate ands momentarily see
*   blank content. This is a tradeoff that can be adjusted to suit the needs of each application,
*   and we are working on improving it behind the scenes.
* - By default, the list looks for a `key` prop on each item and uses that for the React key.
*   Alternatively, you can provide a custom `keyExtractor` prop.
*
* Also inherits [ScrollView Props](docs/scrollview.html#props), unless it is nested in another FlatList of same orientation.
*/
var FlatList = class extends import_react.PureComponent {
	/**
	* Scrolls to the end of the content. May be janky without `getItemLayout` prop.
	*/
	scrollToEnd(params) {
		if (this._listRef) this._listRef.scrollToEnd(params);
	}
	/**
	* Scrolls to the item at the specified index such that it is positioned in the viewable area
	* such that `viewPosition` 0 places it at the top, 1 at the bottom, and 0.5 centered in the
	* middle. `viewOffset` is a fixed number of pixels to offset the final target position.
	*
	* Note: cannot scroll to locations outside the render window without specifying the
	* `getItemLayout` prop.
	*/
	scrollToIndex(params) {
		if (this._listRef) this._listRef.scrollToIndex(params);
	}
	/**
	* Requires linear scan through data - use `scrollToIndex` instead if possible.
	*
	* Note: cannot scroll to locations outside the render window without specifying the
	* `getItemLayout` prop.
	*/
	scrollToItem(params) {
		if (this._listRef) this._listRef.scrollToItem(params);
	}
	/**
	* Scroll to a specific content pixel offset in the list.
	*
	* Check out [scrollToOffset](docs/virtualizedlist.html#scrolltooffset) of VirtualizedList
	*/
	scrollToOffset(params) {
		if (this._listRef) this._listRef.scrollToOffset(params);
	}
	/**
	* Tells the list an interaction has occurred, which should trigger viewability calculations, e.g.
	* if `waitForInteractions` is true and the user has not scrolled. This is typically called by
	* taps on items or by navigation actions.
	*/
	recordInteraction() {
		if (this._listRef) this._listRef.recordInteraction();
	}
	/**
	* Displays the scroll indicators momentarily.
	*
	* @platform ios
	*/
	flashScrollIndicators() {
		if (this._listRef) this._listRef.flashScrollIndicators();
	}
	/**
	* Provides a handle to the underlying scroll responder.
	*/
	getScrollResponder() {
		if (this._listRef) return this._listRef.getScrollResponder();
	}
	/**
	* Provides a reference to the underlying host component
	*/
	getNativeScrollRef() {
		if (this._listRef) return this._listRef.getScrollRef();
	}
	getScrollableNode() {
		if (this._listRef) return this._listRef.getScrollableNode();
	}
	constructor(_props) {
		super(_props);
		this._virtualizedListPairs = [];
		this._captureRef = (ref) => {
			this._listRef = ref;
		};
		this._getItem = (data, index) => {
			var numColumns = numColumnsOrDefault(this.props.numColumns);
			if (numColumns > 1) {
				var ret = [];
				for (var kk = 0; kk < numColumns; kk++) {
					var itemIndex = index * numColumns + kk;
					if (itemIndex < data.length) {
						var _item = data[itemIndex];
						ret.push(_item);
					}
				}
				return ret;
			} else return data[index];
		};
		this._getItemCount = (data) => {
			if (data != null && isArrayLike(data)) {
				var numColumns = numColumnsOrDefault(this.props.numColumns);
				return numColumns > 1 ? Math.ceil(data.length / numColumns) : data.length;
			} else return 0;
		};
		this._keyExtractor = (items, index) => {
			var _this$props$keyExtrac;
			var numColumns = numColumnsOrDefault(this.props.numColumns);
			var keyExtractor$2 = (_this$props$keyExtrac = this.props.keyExtractor) !== null && _this$props$keyExtrac !== void 0 ? _this$props$keyExtrac : keyExtractor;
			if (numColumns > 1) {
				(0, import_invariant.default)(Array.isArray(items), "FlatList: Encountered internal consistency error, expected each item to consist of an array with 1-%s columns; instead, received a single item.", numColumns);
				return items.map((item, kk) => keyExtractor$2(item, index * numColumns + kk)).join(":");
			}
			return keyExtractor$2(items, index);
		};
		this._renderer = (ListItemComponent, renderItem, columnWrapperStyle, numColumns, extraData) => {
			var cols = numColumnsOrDefault(numColumns);
			var render = (props) => {
				if (ListItemComponent) return /*#__PURE__*/ import_react.createElement(ListItemComponent, props);
				else if (renderItem) return renderItem(props);
				else return null;
			};
			var renderProp = (info) => {
				if (cols > 1) {
					var _item2 = info.item, _index = info.index;
					(0, import_invariant.default)(Array.isArray(_item2), "Expected array of items with numColumns > 1");
					return /*#__PURE__*/ import_react.createElement(View, { style: [styles$17.row, columnWrapperStyle] }, _item2.map((it, kk) => {
						var element = render({
							item: it,
							index: _index * cols + kk,
							separators: info.separators
						});
						return element != null ? /*#__PURE__*/ import_react.createElement(import_react.Fragment, { key: kk }, element) : null;
					}));
				} else return render(info);
			};
			return ListItemComponent ? { ListItemComponent: renderProp } : { renderItem: renderProp };
		};
		this._memoizedRenderer = memoizeOne(this._renderer);
		this._checkProps(this.props);
		if (this.props.viewabilityConfigCallbackPairs) this._virtualizedListPairs = this.props.viewabilityConfigCallbackPairs.map((pair) => ({
			viewabilityConfig: pair.viewabilityConfig,
			onViewableItemsChanged: this._createOnViewableItemsChanged(pair.onViewableItemsChanged)
		}));
		else if (this.props.onViewableItemsChanged) this._virtualizedListPairs.push({
			viewabilityConfig: this.props.viewabilityConfig,
			onViewableItemsChanged: this._createOnViewableItemsChanged(this.props.onViewableItemsChanged)
		});
	}
	componentDidUpdate(prevProps) {
		(0, import_invariant.default)(prevProps.numColumns === this.props.numColumns, "Changing numColumns on the fly is not supported. Change the key prop on FlatList when changing the number of columns to force a fresh render of the component.");
		(0, import_invariant.default)(prevProps.onViewableItemsChanged === this.props.onViewableItemsChanged, "Changing onViewableItemsChanged on the fly is not supported");
		(0, import_invariant.default)(!deepDiffer(prevProps.viewabilityConfig, this.props.viewabilityConfig), "Changing viewabilityConfig on the fly is not supported");
		(0, import_invariant.default)(prevProps.viewabilityConfigCallbackPairs === this.props.viewabilityConfigCallbackPairs, "Changing viewabilityConfigCallbackPairs on the fly is not supported");
		this._checkProps(this.props);
	}
	_checkProps(props) {
		var getItem = props.getItem, getItemCount = props.getItemCount, horizontal = props.horizontal, columnWrapperStyle = props.columnWrapperStyle, onViewableItemsChanged = props.onViewableItemsChanged, viewabilityConfigCallbackPairs = props.viewabilityConfigCallbackPairs;
		var numColumns = numColumnsOrDefault(this.props.numColumns);
		(0, import_invariant.default)(!getItem && !getItemCount, "FlatList does not support custom data formats.");
		if (numColumns > 1) (0, import_invariant.default)(!horizontal, "numColumns does not support horizontal.");
		else (0, import_invariant.default)(!columnWrapperStyle, "columnWrapperStyle not supported for single column lists");
		(0, import_invariant.default)(!(onViewableItemsChanged && viewabilityConfigCallbackPairs), "FlatList does not support setting both onViewableItemsChanged and viewabilityConfigCallbackPairs.");
	}
	_pushMultiColumnViewable(arr, v) {
		var _this$props$keyExtrac2;
		var numColumns = numColumnsOrDefault(this.props.numColumns);
		var keyExtractor$3 = (_this$props$keyExtrac2 = this.props.keyExtractor) !== null && _this$props$keyExtrac2 !== void 0 ? _this$props$keyExtrac2 : keyExtractor;
		v.item.forEach((item, ii) => {
			(0, import_invariant.default)(v.index != null, "Missing index!");
			var index = v.index * numColumns + ii;
			arr.push(_objectSpread2(_objectSpread2({}, v), {}, {
				item,
				key: keyExtractor$3(item, index),
				index
			}));
		});
	}
	_createOnViewableItemsChanged(onViewableItemsChanged) {
		return (info) => {
			var numColumns = numColumnsOrDefault(this.props.numColumns);
			if (onViewableItemsChanged) {
				if (numColumns > 1) {
					var changed = [];
					var viewableItems = [];
					info.viewableItems.forEach((v) => this._pushMultiColumnViewable(viewableItems, v));
					info.changed.forEach((v) => this._pushMultiColumnViewable(changed, v));
					onViewableItemsChanged({
						viewableItems,
						changed
					});
				} else onViewableItemsChanged(info);
			}
		};
	}
	render() {
		var _this$props = this.props, numColumns = _this$props.numColumns, columnWrapperStyle = _this$props.columnWrapperStyle, _removeClippedSubviews = _this$props.removeClippedSubviews, _this$props$strictMod = _this$props.strictMode, strictMode = _this$props$strictMod === void 0 ? false : _this$props$strictMod, restProps = _objectWithoutPropertiesLoose(_this$props, _excluded$19);
		var renderer = strictMode ? this._memoizedRenderer : this._renderer;
		return /*#__PURE__*/ import_react.createElement(VirtualizedList, _extends({}, restProps, {
			getItem: this._getItem,
			getItemCount: this._getItemCount,
			keyExtractor: this._keyExtractor,
			ref: this._captureRef,
			viewabilityConfigCallbackPairs: this._virtualizedListPairs,
			removeClippedSubviews: removeClippedSubviewsOrDefault(_removeClippedSubviews)
		}, renderer(this.props.ListItemComponent, this.props.renderItem, columnWrapperStyle, numColumns, this.props.extraData)));
	}
};
var styles$17 = stylesheet.create({ row: { flexDirection: "row" } });
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/FlatList/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var FlatList_default = FlatList;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/TurboModule/TurboModuleRegistry.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
function get(name) {
	return null;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/NativeAnimatedModule.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedModule_default = get("NativeAnimatedModule");
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/NativeAnimatedTurboModule.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedTurboModule_default = get("NativeAnimatedTurboModule");
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/EventEmitter/RCTDeviceEventEmitter.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* Global EventEmitter used by the native platform to emit events to JavaScript.
* Events are identified by globally unique event names.
*
* NativeModules that emit events should instead subclass `NativeEventEmitter`.
*/
var RCTDeviceEventEmitter_default = new EventEmitter();
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/EventEmitter/NativeEventEmitter.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* `NativeEventEmitter` is intended for use by Native Modules to emit events to
* JavaScript listeners. If a `NativeModule` is supplied to the constructor, it
* will be notified (via `addListener` and `removeListeners`) when the listener
* count changes to manage "native memory".
*
* Currently, all native events are fired via a global `RCTDeviceEventEmitter`.
* This means event names must be globally unique, and it means that call sites
* can theoretically listen to `RCTDeviceEventEmitter` (although discouraged).
*/
var NativeEventEmitter = class {
	constructor(nativeModule) {
		if (Platform.OS === "ios") {
			(0, import_invariant.default)(nativeModule != null, "`new NativeEventEmitter()` requires a non-null argument.");
			this._nativeModule = nativeModule;
		}
	}
	addListener(eventType, listener, context) {
		var _this$_nativeModule;
		(_this$_nativeModule = this._nativeModule) == null || _this$_nativeModule.addListener(eventType);
		var subscription = RCTDeviceEventEmitter_default.addListener(eventType, listener, context);
		return { remove: () => {
			if (subscription != null) {
				var _this$_nativeModule2;
				(_this$_nativeModule2 = this._nativeModule) == null || _this$_nativeModule2.removeListeners(1);
				subscription.remove();
				subscription = null;
			}
		} };
	}
	/**
	* @deprecated Use `remove` on the EventSubscription from `addListener`.
	*/
	removeListener(eventType, listener) {
		var _this$_nativeModule3;
		(_this$_nativeModule3 = this._nativeModule) == null || _this$_nativeModule3.removeListeners(1);
		RCTDeviceEventEmitter_default.removeListener(eventType, listener);
	}
	emit(eventType) {
		for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
		RCTDeviceEventEmitter_default.emit(eventType, ...args);
	}
	removeAllListeners(eventType) {
		var _this$_nativeModule4;
		(0, import_invariant.default)(eventType != null, "`NativeEventEmitter.removeAllListener()` requires a non-null argument.");
		(_this$_nativeModule4 = this._nativeModule) == null || _this$_nativeModule4.removeListeners(this.listenerCount(eventType));
		RCTDeviceEventEmitter_default.removeAllListeners(eventType);
	}
	listenerCount(eventType) {
		return RCTDeviceEventEmitter_default.listenerCount(eventType);
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Utilities/Platform.js
var Platform_default = Platform;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/ReactNative/ReactNativeFeatureFlags.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var ReactNativeFeatureFlags = {
	isLayoutAnimationEnabled: () => true,
	shouldEmitW3CPointerEvents: () => false,
	shouldPressibilityUseW3CPointerEventsForHover: () => false,
	animatedShouldDebounceQueueFlush: () => false,
	animatedShouldUseSingleOp: () => false
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/NativeAnimatedHelper.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedModule = Platform_default.OS === "ios" && global.RN$Bridgeless === true ? NativeAnimatedTurboModule_default : NativeAnimatedModule_default;
var __nativeAnimatedNodeTagCount = 1;
var __nativeAnimationIdCount = 1;
var nativeEventEmitter;
var waitingForQueuedOperations = /* @__PURE__ */ new Set();
var queueOperations = false;
var queue = [];
var singleOpQueue = [];
var useSingleOpBatching = false;
Platform_default.OS === "android" && NativeAnimatedModule != null && NativeAnimatedModule.queueAndExecuteBatchedOperations && ReactNativeFeatureFlags.animatedShouldUseSingleOp();
var flushQueueTimeout = null;
var eventListenerGetValueCallbacks = {};
var eventListenerAnimationFinishedCallbacks = {};
var nativeOps = useSingleOpBatching ? function() {
	return [
		"createAnimatedNode",
		"updateAnimatedNodeConfig",
		"getValue",
		"startListeningToAnimatedNodeValue",
		"stopListeningToAnimatedNodeValue",
		"connectAnimatedNodes",
		"disconnectAnimatedNodes",
		"startAnimatingNode",
		"stopAnimation",
		"setAnimatedNodeValue",
		"setAnimatedNodeOffset",
		"flattenAnimatedNodeOffset",
		"extractAnimatedNodeOffset",
		"connectAnimatedNodeToView",
		"disconnectAnimatedNodeFromView",
		"restoreDefaultValues",
		"dropAnimatedNode",
		"addAnimatedEventToView",
		"removeAnimatedEventFromView",
		"addListener",
		"removeListener"
	].reduce((acc, functionName, i) => {
		acc[functionName] = i + 1;
		return acc;
	}, {});
}() : NativeAnimatedModule;
/**
* Wrappers around NativeAnimatedModule to provide flow and autocomplete support for
* the native module methods, and automatic queue management on Android
*/
var API = {
	getValue: function getValue(tag, saveValueCallback) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		if (useSingleOpBatching) {
			if (saveValueCallback) eventListenerGetValueCallbacks[tag] = saveValueCallback;
			API.queueOperation(nativeOps.getValue, tag);
		} else API.queueOperation(nativeOps.getValue, tag, saveValueCallback);
	},
	setWaitingForIdentifier: function setWaitingForIdentifier(id) {
		waitingForQueuedOperations.add(id);
		queueOperations = true;
		if (ReactNativeFeatureFlags.animatedShouldDebounceQueueFlush() && flushQueueTimeout) clearTimeout(flushQueueTimeout);
	},
	unsetWaitingForIdentifier: function unsetWaitingForIdentifier(id) {
		waitingForQueuedOperations.delete(id);
		if (waitingForQueuedOperations.size === 0) {
			queueOperations = false;
			API.disableQueue();
		}
	},
	disableQueue: function disableQueue() {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		if (ReactNativeFeatureFlags.animatedShouldDebounceQueueFlush()) {
			var prevTimeout = flushQueueTimeout;
			clearImmediate(prevTimeout);
			flushQueueTimeout = setImmediate(API.flushQueue);
		} else API.flushQueue();
	},
	flushQueue: function flushQueue() {},
	queueOperation: function queueOperation(fn) {
		for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
		if (useSingleOpBatching) {
			singleOpQueue.push(fn, ...args);
			return;
		}
		if (queueOperations || queue.length !== 0) queue.push(() => fn(...args));
		else fn(...args);
	},
	createAnimatedNode: function createAnimatedNode(tag, config) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.createAnimatedNode, tag, config);
	},
	updateAnimatedNodeConfig: function updateAnimatedNodeConfig(tag, config) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
	},
	startListeningToAnimatedNodeValue: function startListeningToAnimatedNodeValue(tag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.startListeningToAnimatedNodeValue, tag);
	},
	stopListeningToAnimatedNodeValue: function stopListeningToAnimatedNodeValue(tag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.stopListeningToAnimatedNodeValue, tag);
	},
	connectAnimatedNodes: function connectAnimatedNodes(parentTag, childTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.connectAnimatedNodes, parentTag, childTag);
	},
	disconnectAnimatedNodes: function disconnectAnimatedNodes(parentTag, childTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.disconnectAnimatedNodes, parentTag, childTag);
	},
	startAnimatingNode: function startAnimatingNode(animationId, nodeTag, config, endCallback) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		if (useSingleOpBatching) {
			if (endCallback) eventListenerAnimationFinishedCallbacks[animationId] = endCallback;
			API.queueOperation(nativeOps.startAnimatingNode, animationId, nodeTag, config);
		} else API.queueOperation(nativeOps.startAnimatingNode, animationId, nodeTag, config, endCallback);
	},
	stopAnimation: function stopAnimation(animationId) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.stopAnimation, animationId);
	},
	setAnimatedNodeValue: function setAnimatedNodeValue(nodeTag, value) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.setAnimatedNodeValue, nodeTag, value);
	},
	setAnimatedNodeOffset: function setAnimatedNodeOffset(nodeTag, offset) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.setAnimatedNodeOffset, nodeTag, offset);
	},
	flattenAnimatedNodeOffset: function flattenAnimatedNodeOffset(nodeTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.flattenAnimatedNodeOffset, nodeTag);
	},
	extractAnimatedNodeOffset: function extractAnimatedNodeOffset(nodeTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.extractAnimatedNodeOffset, nodeTag);
	},
	connectAnimatedNodeToView: function connectAnimatedNodeToView(nodeTag, viewTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.connectAnimatedNodeToView, nodeTag, viewTag);
	},
	disconnectAnimatedNodeFromView: function disconnectAnimatedNodeFromView(nodeTag, viewTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.disconnectAnimatedNodeFromView, nodeTag, viewTag);
	},
	restoreDefaultValues: function restoreDefaultValues(nodeTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		if (nativeOps.restoreDefaultValues != null) API.queueOperation(nativeOps.restoreDefaultValues, nodeTag);
	},
	dropAnimatedNode: function dropAnimatedNode(tag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.dropAnimatedNode, tag);
	},
	addAnimatedEventToView: function addAnimatedEventToView(viewTag, eventName, eventMapping) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.addAnimatedEventToView, viewTag, eventName, eventMapping);
	},
	removeAnimatedEventFromView(viewTag, eventName, animatedNodeTag) {
		(0, import_invariant.default)(nativeOps, "Native animated module is not available");
		API.queueOperation(nativeOps.removeAnimatedEventFromView, viewTag, eventName, animatedNodeTag);
	}
};
/**
* Styles allowed by the native animated implementation.
*
* In general native animated implementation should support any numeric or color property that
* doesn't need to be updated through the shadow view hierarchy (all non-layout properties).
*/
var SUPPORTED_COLOR_STYLES = {
	backgroundColor: true,
	borderBottomColor: true,
	borderColor: true,
	borderEndColor: true,
	borderLeftColor: true,
	borderRightColor: true,
	borderStartColor: true,
	borderTopColor: true,
	color: true,
	tintColor: true
};
var SUPPORTED_STYLES = _objectSpread2(_objectSpread2({}, SUPPORTED_COLOR_STYLES), {}, {
	borderBottomEndRadius: true,
	borderBottomLeftRadius: true,
	borderBottomRightRadius: true,
	borderBottomStartRadius: true,
	borderRadius: true,
	borderTopEndRadius: true,
	borderTopLeftRadius: true,
	borderTopRightRadius: true,
	borderTopStartRadius: true,
	elevation: true,
	opacity: true,
	transform: true,
	zIndex: true,
	shadowOpacity: true,
	shadowRadius: true,
	scaleX: true,
	scaleY: true,
	translateX: true,
	translateY: true
});
var SUPPORTED_TRANSFORMS = {
	translateX: true,
	translateY: true,
	scale: true,
	scaleX: true,
	scaleY: true,
	rotate: true,
	rotateX: true,
	rotateY: true,
	rotateZ: true,
	perspective: true
};
var SUPPORTED_INTERPOLATION_PARAMS = {
	inputRange: true,
	outputRange: true,
	extrapolate: true,
	extrapolateRight: true,
	extrapolateLeft: true
};
function addWhitelistedStyleProp(prop) {
	SUPPORTED_STYLES[prop] = true;
}
function addWhitelistedTransformProp(prop) {
	SUPPORTED_TRANSFORMS[prop] = true;
}
function addWhitelistedInterpolationParam(param) {
	SUPPORTED_INTERPOLATION_PARAMS[param] = true;
}
function isSupportedColorStyleProp(prop) {
	return SUPPORTED_COLOR_STYLES.hasOwnProperty(prop);
}
function isSupportedStyleProp(prop) {
	return SUPPORTED_STYLES.hasOwnProperty(prop);
}
function isSupportedTransformProp(prop) {
	return SUPPORTED_TRANSFORMS.hasOwnProperty(prop);
}
function isSupportedInterpolationParam(param) {
	return SUPPORTED_INTERPOLATION_PARAMS.hasOwnProperty(param);
}
function validateTransform(configs) {
	configs.forEach((config) => {
		if (!isSupportedTransformProp(config.property)) throw new Error("Property '" + config.property + "' is not supported by native animated module");
	});
}
function validateStyles(styles) {
	for (var _key2 in styles) if (!isSupportedStyleProp(_key2)) throw new Error("Style property '" + _key2 + "' is not supported by native animated module");
}
function validateInterpolation(config) {
	for (var _key3 in config) if (!isSupportedInterpolationParam(_key3)) throw new Error("Interpolation property '" + _key3 + "' is not supported by native animated module");
}
function generateNewNodeTag() {
	return __nativeAnimatedNodeTagCount++;
}
function generateNewAnimationId() {
	return __nativeAnimationIdCount++;
}
function assertNativeAnimatedModule() {
	(0, import_invariant.default)(NativeAnimatedModule, "Native animated module is not available");
}
var _warnedMissingNativeAnimated = false;
function shouldUseNativeDriver(config) {
	if (config.useNativeDriver == null) console.warn("Animated: `useNativeDriver` was not specified. This is a required option and must be explicitly set to `true` or `false`");
	if (config.useNativeDriver === true && !NativeAnimatedModule) {
		if (!_warnedMissingNativeAnimated) {
			console.warn("Animated: `useNativeDriver` is not supported because the native animated module is missing. Falling back to JS-based animation. To resolve this, add `RCTAnimation` module to this app, or remove `useNativeDriver`. Make sure to run `bundle exec pod install` first. Read more about autolinking: https://github.com/react-native-community/cli/blob/master/docs/autolinking.md");
			_warnedMissingNativeAnimated = true;
		}
		return false;
	}
	return config.useNativeDriver || false;
}
function transformDataType(value) {
	if (typeof value !== "string") return value;
	if (/deg$/.test(value)) return (parseFloat(value) || 0) * Math.PI / 180;
	else return value;
}
var NativeAnimatedHelper_default = {
	API,
	isSupportedColorStyleProp,
	isSupportedStyleProp,
	isSupportedTransformProp,
	isSupportedInterpolationParam,
	addWhitelistedStyleProp,
	addWhitelistedTransformProp,
	addWhitelistedInterpolationParam,
	validateStyles,
	validateTransform,
	validateInterpolation,
	generateNewNodeTag,
	generateNewAnimationId,
	assertNativeAnimatedModule,
	shouldUseNativeDriver,
	transformDataType,
	get nativeEventEmitter() {
		if (!nativeEventEmitter) nativeEventEmitter = new NativeEventEmitter(Platform_default.OS !== "ios" ? null : NativeAnimatedModule);
		return nativeEventEmitter;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedNode.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedAPI$2 = NativeAnimatedHelper_default.API;
var _uniqueId$2 = 1;
var AnimatedNode = class {
	__attach() {}
	__detach() {
		if (this.__isNative && this.__nativeTag != null) {
			NativeAnimatedHelper_default.API.dropAnimatedNode(this.__nativeTag);
			this.__nativeTag = void 0;
		}
	}
	__getValue() {}
	__getAnimatedValue() {
		return this.__getValue();
	}
	__addChild(child) {}
	__removeChild(child) {}
	__getChildren() {
		return [];
	}
	constructor() {
		this._listeners = {};
	}
	__makeNative(platformConfig) {
		if (!this.__isNative) throw new Error("This node cannot be made a \"native\" animated node");
		this._platformConfig = platformConfig;
		if (this.hasListeners()) this._startListeningToNativeValueUpdates();
	}
	/**
	* Adds an asynchronous listener to the value so you can observe updates from
	* animations.  This is useful because there is no way to
	* synchronously read the value because it might be driven natively.
	*
	* See https://reactnative.dev/docs/animatedvalue#addlistener
	*/
	addListener(callback) {
		var id = String(_uniqueId$2++);
		this._listeners[id] = callback;
		if (this.__isNative) this._startListeningToNativeValueUpdates();
		return id;
	}
	/**
	* Unregister a listener. The `id` param shall match the identifier
	* previously returned by `addListener()`.
	*
	* See https://reactnative.dev/docs/animatedvalue#removelistener
	*/
	removeListener(id) {
		delete this._listeners[id];
		if (this.__isNative && !this.hasListeners()) this._stopListeningForNativeValueUpdates();
	}
	/**
	* Remove all registered listeners.
	*
	* See https://reactnative.dev/docs/animatedvalue#removealllisteners
	*/
	removeAllListeners() {
		this._listeners = {};
		if (this.__isNative) this._stopListeningForNativeValueUpdates();
	}
	hasListeners() {
		return !!Object.keys(this._listeners).length;
	}
	_startListeningToNativeValueUpdates() {
		if (this.__nativeAnimatedValueListener && !this.__shouldUpdateListenersForNewNativeTag) return;
		if (this.__shouldUpdateListenersForNewNativeTag) {
			this.__shouldUpdateListenersForNewNativeTag = false;
			this._stopListeningForNativeValueUpdates();
		}
		NativeAnimatedAPI$2.startListeningToAnimatedNodeValue(this.__getNativeTag());
		this.__nativeAnimatedValueListener = NativeAnimatedHelper_default.nativeEventEmitter.addListener("onAnimatedValueUpdate", (data) => {
			if (data.tag !== this.__getNativeTag()) return;
			this.__onAnimatedValueUpdateReceived(data.value);
		});
	}
	__onAnimatedValueUpdateReceived(value) {
		this.__callListeners(value);
	}
	__callListeners(value) {
		for (var _key in this._listeners) this._listeners[_key]({ value });
	}
	_stopListeningForNativeValueUpdates() {
		if (!this.__nativeAnimatedValueListener) return;
		this.__nativeAnimatedValueListener.remove();
		this.__nativeAnimatedValueListener = null;
		NativeAnimatedAPI$2.stopListeningToAnimatedNodeValue(this.__getNativeTag());
	}
	__getNativeTag() {
		var _this$__nativeTag;
		NativeAnimatedHelper_default.assertNativeAnimatedModule();
		(0, import_invariant.default)(this.__isNative, "Attempt to get native tag from node not marked as \"native\"");
		var nativeTag = (_this$__nativeTag = this.__nativeTag) !== null && _this$__nativeTag !== void 0 ? _this$__nativeTag : NativeAnimatedHelper_default.generateNewNodeTag();
		if (this.__nativeTag == null) {
			this.__nativeTag = nativeTag;
			var config = this.__getNativeConfig();
			if (this._platformConfig) config.platformConfig = this._platformConfig;
			NativeAnimatedHelper_default.API.createAnimatedNode(nativeTag, config);
			this.__shouldUpdateListenersForNewNativeTag = true;
		}
		return nativeTag;
	}
	__getNativeConfig() {
		throw new Error("This JS animated node type cannot be used as native animated node");
	}
	toJSON() {
		return this.__getValue();
	}
	__getPlatformConfig() {
		return this._platformConfig;
	}
	__setPlatformConfig(platformConfig) {
		this._platformConfig = platformConfig;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedWithChildren.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedWithChildren = class extends AnimatedNode {
	constructor() {
		super();
		this._children = [];
	}
	__makeNative(platformConfig) {
		if (!this.__isNative) {
			this.__isNative = true;
			for (var _iterator = _createForOfIteratorHelperLoose(this._children), _step; !(_step = _iterator()).done;) {
				var child = _step.value;
				child.__makeNative(platformConfig);
				NativeAnimatedHelper_default.API.connectAnimatedNodes(this.__getNativeTag(), child.__getNativeTag());
			}
		}
		super.__makeNative(platformConfig);
	}
	__addChild(child) {
		if (this._children.length === 0) this.__attach();
		this._children.push(child);
		if (this.__isNative) {
			child.__makeNative(this.__getPlatformConfig());
			NativeAnimatedHelper_default.API.connectAnimatedNodes(this.__getNativeTag(), child.__getNativeTag());
		}
	}
	__removeChild(child) {
		var index = this._children.indexOf(child);
		if (index === -1) {
			console.warn("Trying to remove a child that doesn't exist");
			return;
		}
		if (this.__isNative && child.__isNative) NativeAnimatedHelper_default.API.disconnectAnimatedNodes(this.__getNativeTag(), child.__getNativeTag());
		this._children.splice(index, 1);
		if (this._children.length === 0) this.__detach();
	}
	__getChildren() {
		return this._children;
	}
	__callListeners(value) {
		super.__callListeners(value);
		if (!this.__isNative) for (var _iterator2 = _createForOfIteratorHelperLoose(this._children), _step2; !(_step2 = _iterator2()).done;) {
			var child = _step2.value;
			if (child.__getValue) child.__callListeners(child.__getValue());
		}
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedInterpolation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var __DEV__$1 = true;
var linear = (t) => t;
/**
* Very handy helper to map input ranges to output ranges with an easing
* function and custom behavior outside of the ranges.
*/
function createInterpolation(config) {
	if (config.outputRange && typeof config.outputRange[0] === "string") return createInterpolationFromStringOutputRange(config);
	var outputRange = config.outputRange;
	var inputRange = config.inputRange;
	if (__DEV__$1) {
		checkInfiniteRange("outputRange", outputRange);
		checkInfiniteRange("inputRange", inputRange);
		checkValidInputRange(inputRange);
		(0, import_invariant.default)(inputRange.length === outputRange.length, "inputRange (" + inputRange.length + ") and outputRange (" + outputRange.length + ") must have the same length");
	}
	var easing = config.easing || linear;
	var extrapolateLeft = "extend";
	if (config.extrapolateLeft !== void 0) extrapolateLeft = config.extrapolateLeft;
	else if (config.extrapolate !== void 0) extrapolateLeft = config.extrapolate;
	var extrapolateRight = "extend";
	if (config.extrapolateRight !== void 0) extrapolateRight = config.extrapolateRight;
	else if (config.extrapolate !== void 0) extrapolateRight = config.extrapolate;
	return (input) => {
		(0, import_invariant.default)(typeof input === "number", "Cannot interpolation an input which is not a number");
		var range = findRange(input, inputRange);
		return interpolate(input, inputRange[range], inputRange[range + 1], outputRange[range], outputRange[range + 1], easing, extrapolateLeft, extrapolateRight);
	};
}
function interpolate(input, inputMin, inputMax, outputMin, outputMax, easing, extrapolateLeft, extrapolateRight) {
	var result = input;
	if (result < inputMin) {
		if (extrapolateLeft === "identity") return result;
		else if (extrapolateLeft === "clamp") result = inputMin;
		else if (extrapolateLeft === "extend") {}
	}
	if (result > inputMax) {
		if (extrapolateRight === "identity") return result;
		else if (extrapolateRight === "clamp") result = inputMax;
		else if (extrapolateRight === "extend") {}
	}
	if (outputMin === outputMax) return outputMin;
	if (inputMin === inputMax) {
		if (input <= inputMin) return outputMin;
		return outputMax;
	}
	if (inputMin === -Infinity) result = -result;
	else if (inputMax === Infinity) result = result - inputMin;
	else result = (result - inputMin) / (inputMax - inputMin);
	result = easing(result);
	if (outputMin === -Infinity) result = -result;
	else if (outputMax === Infinity) result = result + outputMin;
	else result = result * (outputMax - outputMin) + outputMin;
	return result;
}
function colorToRgba(input) {
	var normalizedColor = (0, import_normalize_colors.default)(input);
	if (normalizedColor === null || typeof normalizedColor !== "number") return input;
	normalizedColor = normalizedColor || 0;
	var r = (normalizedColor & 4278190080) >>> 24;
	var g = (normalizedColor & 16711680) >>> 16;
	var b = (normalizedColor & 65280) >>> 8;
	var a = (normalizedColor & 255) / 255;
	return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}
var stringShapeRegex = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
/**
* Supports string shapes by extracting numbers so new values can be computed,
* and recombines those values into new strings of the same shape.  Supports
* things like:
*
*   rgba(123, 42, 99, 0.36) // colors
*   -45deg                  // values with units
*/
function createInterpolationFromStringOutputRange(config) {
	var outputRange = config.outputRange;
	(0, import_invariant.default)(outputRange.length >= 2, "Bad output range");
	outputRange = outputRange.map(colorToRgba);
	checkPattern(outputRange);
	var outputRanges = outputRange[0].match(stringShapeRegex).map(() => []);
	outputRange.forEach((value) => {
		value.match(stringShapeRegex).forEach((number, i) => {
			outputRanges[i].push(+number);
		});
	});
	var interpolations = outputRange[0].match(stringShapeRegex).map((value, i) => {
		return createInterpolation(_objectSpread2(_objectSpread2({}, config), {}, { outputRange: outputRanges[i] }));
	});
	var shouldRound = isRgbOrRgba(outputRange[0]);
	return (input) => {
		var i = 0;
		return outputRange[0].replace(stringShapeRegex, () => {
			var val = +interpolations[i++](input);
			if (shouldRound) val = i < 4 ? Math.round(val) : Math.round(val * 1e3) / 1e3;
			return String(val);
		});
	};
}
function isRgbOrRgba(range) {
	return typeof range === "string" && range.startsWith("rgb");
}
function checkPattern(arr) {
	var pattern = arr[0].replace(stringShapeRegex, "");
	for (var i = 1; i < arr.length; ++i) (0, import_invariant.default)(pattern === arr[i].replace(stringShapeRegex, ""), "invalid pattern " + arr[0] + " and " + arr[i]);
}
function findRange(input, inputRange) {
	var i = 1;
	for (; i < inputRange.length - 1; ++i) if (inputRange[i] >= input) break;
	return i - 1;
}
function checkValidInputRange(arr) {
	(0, import_invariant.default)(arr.length >= 2, "inputRange must have at least 2 elements");
	var message = "inputRange must be monotonically non-decreasing " + String(arr);
	for (var i = 1; i < arr.length; ++i) (0, import_invariant.default)(arr[i] >= arr[i - 1], message);
}
function checkInfiniteRange(name, arr) {
	(0, import_invariant.default)(arr.length >= 2, name + " must have at least 2 elements");
	(0, import_invariant.default)(arr.length !== 2 || arr[0] !== -Infinity || arr[1] !== Infinity, name + "cannot be ]-infinity;+infinity[ " + arr);
}
var AnimatedInterpolation = class AnimatedInterpolation extends AnimatedWithChildren {
	constructor(parent, config) {
		super();
		this._parent = parent;
		this._config = config;
		this._interpolation = createInterpolation(config);
	}
	__makeNative(platformConfig) {
		this._parent.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		var parentValue = this._parent.__getValue();
		(0, import_invariant.default)(typeof parentValue === "number", "Cannot interpolate an input which is not a number.");
		return this._interpolation(parentValue);
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._parent.__addChild(this);
	}
	__detach() {
		this._parent.__removeChild(this);
		super.__detach();
	}
	__transformDataType(range) {
		return range.map(NativeAnimatedHelper_default.transformDataType);
	}
	__getNativeConfig() {
		if (__DEV__$1) NativeAnimatedHelper_default.validateInterpolation(this._config);
		return {
			inputRange: this._config.inputRange,
			outputRange: this.__transformDataType(this._config.outputRange),
			extrapolateLeft: this._config.extrapolateLeft || this._config.extrapolate || "extend",
			extrapolateRight: this._config.extrapolateRight || this._config.extrapolate || "extend",
			type: "interpolation"
		};
	}
};
AnimatedInterpolation.__createInterpolation = createInterpolation;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedValue.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedAPI$1 = NativeAnimatedHelper_default.API;
/**
* Animated works by building a directed acyclic graph of dependencies
* transparently when you render your Animated components.
*
*               new Animated.Value(0)
*     .interpolate()        .interpolate()    new Animated.Value(1)
*         opacity               translateY      scale
*          style                         transform
*         View#234                         style
*                                         View#123
*
* A) Top Down phase
* When an Animated.Value is updated, we recursively go down through this
* graph in order to find leaf nodes: the views that we flag as needing
* an update.
*
* B) Bottom Up phase
* When a view is flagged as needing an update, we recursively go back up
* in order to build the new value that it needs. The reason why we need
* this two-phases process is to deal with composite props such as
* transform which can receive values from multiple parents.
*/
function _flush(rootNode) {
	var animatedStyles = /* @__PURE__ */ new Set();
	function findAnimatedStyles(node) {
		if (typeof node.update === "function") animatedStyles.add(node);
		else node.__getChildren().forEach(findAnimatedStyles);
	}
	findAnimatedStyles(rootNode);
	animatedStyles.forEach((animatedStyle) => animatedStyle.update());
}
/**
* Some operations are executed only on batch end, which is _mostly_ scheduled when
* Animated component props change. For some of the changes which require immediate execution
* (e.g. setValue), we create a separate batch in case none is scheduled.
*/
function _executeAsAnimatedBatch(id, operation) {
	NativeAnimatedAPI$1.setWaitingForIdentifier(id);
	operation();
	NativeAnimatedAPI$1.unsetWaitingForIdentifier(id);
}
/**
* Standard value for driving animations.  One `Animated.Value` can drive
* multiple properties in a synchronized fashion, but can only be driven by one
* mechanism at a time.  Using a new mechanism (e.g. starting a new animation,
* or calling `setValue`) will stop any previous ones.
*
* See https://reactnative.dev/docs/animatedvalue
*/
var AnimatedValue = class extends AnimatedWithChildren {
	constructor(value, config) {
		super();
		if (typeof value !== "number") throw new Error("AnimatedValue: Attempting to set value to undefined");
		this._startingValue = this._value = value;
		this._offset = 0;
		this._animation = null;
		if (config && config.useNativeDriver) this.__makeNative();
	}
	__detach() {
		if (this.__isNative) NativeAnimatedAPI$1.getValue(this.__getNativeTag(), (value) => {
			this._value = value - this._offset;
		});
		this.stopAnimation();
		super.__detach();
	}
	__getValue() {
		return this._value + this._offset;
	}
	/**
	* Directly set the value.  This will stop any animations running on the value
	* and update all the bound properties.
	*
	* See https://reactnative.dev/docs/animatedvalue#setvalue
	*/
	setValue(value) {
		if (this._animation) {
			this._animation.stop();
			this._animation = null;
		}
		this._updateValue(value, !this.__isNative);
		if (this.__isNative) _executeAsAnimatedBatch(this.__getNativeTag().toString(), () => NativeAnimatedAPI$1.setAnimatedNodeValue(this.__getNativeTag(), value));
	}
	/**
	* Sets an offset that is applied on top of whatever value is set, whether via
	* `setValue`, an animation, or `Animated.event`.  Useful for compensating
	* things like the start of a pan gesture.
	*
	* See https://reactnative.dev/docs/animatedvalue#setoffset
	*/
	setOffset(offset) {
		this._offset = offset;
		if (this.__isNative) NativeAnimatedAPI$1.setAnimatedNodeOffset(this.__getNativeTag(), offset);
	}
	/**
	* Merges the offset value into the base value and resets the offset to zero.
	* The final output of the value is unchanged.
	*
	* See https://reactnative.dev/docs/animatedvalue#flattenoffset
	*/
	flattenOffset() {
		this._value += this._offset;
		this._offset = 0;
		if (this.__isNative) NativeAnimatedAPI$1.flattenAnimatedNodeOffset(this.__getNativeTag());
	}
	/**
	* Sets the offset value to the base value, and resets the base value to zero.
	* The final output of the value is unchanged.
	*
	* See https://reactnative.dev/docs/animatedvalue#extractoffset
	*/
	extractOffset() {
		this._offset += this._value;
		this._value = 0;
		if (this.__isNative) NativeAnimatedAPI$1.extractAnimatedNodeOffset(this.__getNativeTag());
	}
	/**
	* Stops any running animation or tracking. `callback` is invoked with the
	* final value after stopping the animation, which is useful for updating
	* state to match the animation position with layout.
	*
	* See https://reactnative.dev/docs/animatedvalue#stopanimation
	*/
	stopAnimation(callback) {
		this.stopTracking();
		this._animation && this._animation.stop();
		this._animation = null;
		if (callback) {
			if (this.__isNative) NativeAnimatedAPI$1.getValue(this.__getNativeTag(), callback);
			else callback(this.__getValue());
		}
	}
	/**
	* Stops any animation and resets the value to its original.
	*
	* See https://reactnative.dev/docs/animatedvalue#resetanimation
	*/
	resetAnimation(callback) {
		this.stopAnimation(callback);
		this._value = this._startingValue;
		if (this.__isNative) NativeAnimatedAPI$1.setAnimatedNodeValue(this.__getNativeTag(), this._startingValue);
	}
	__onAnimatedValueUpdateReceived(value) {
		this._updateValue(value, false);
	}
	/**
	* Interpolates the value before updating the property, e.g. mapping 0-1 to
	* 0-10.
	*/
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	/**
	* Typically only used internally, but could be used by a custom Animation
	* class.
	*
	* See https://reactnative.dev/docs/animatedvalue#animate
	*/
	animate(animation, callback) {
		var handle = null;
		if (animation.__isInteraction) handle = InteractionManager.createInteractionHandle();
		var previousAnimation = this._animation;
		this._animation && this._animation.stop();
		this._animation = animation;
		animation.start(this._value, (value) => {
			this._updateValue(value, true);
		}, (result) => {
			this._animation = null;
			if (handle !== null) InteractionManager.clearInteractionHandle(handle);
			callback && callback(result);
		}, previousAnimation, this);
	}
	/**
	* Typically only used internally.
	*/
	stopTracking() {
		this._tracking && this._tracking.__detach();
		this._tracking = null;
	}
	/**
	* Typically only used internally.
	*/
	track(tracking) {
		this.stopTracking();
		this._tracking = tracking;
		this._tracking && this._tracking.update();
	}
	_updateValue(value, flush) {
		if (value === void 0) throw new Error("AnimatedValue: Attempting to set value to undefined");
		this._value = value;
		if (flush) _flush(this);
		super.__callListeners(this.__getValue());
	}
	__getNativeConfig() {
		return {
			type: "value",
			value: this._value,
			offset: this._offset
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/AnimatedEvent.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var __DEV__ = true;
function attachNativeEvent(viewRef, eventName, argMapping) {
	var eventMappings = [];
	var traverse = (value, path) => {
		if (value instanceof AnimatedValue) {
			value.__makeNative();
			eventMappings.push({
				nativeEventPath: path,
				animatedValueTag: value.__getNativeTag()
			});
		} else if (typeof value === "object") for (var _key in value) traverse(value[_key], path.concat(_key));
	};
	(0, import_invariant.default)(argMapping[0] && argMapping[0].nativeEvent, "Native driven events only support animated values contained inside `nativeEvent`.");
	traverse(argMapping[0].nativeEvent, []);
	if (viewRef != null) eventMappings.forEach((mapping) => {
		NativeAnimatedHelper_default.API.addAnimatedEventToView(viewRef, eventName, mapping);
	});
	return { detach() {
		if (viewRef != null) eventMappings.forEach((mapping) => {
			NativeAnimatedHelper_default.API.removeAnimatedEventFromView(viewRef, eventName, mapping.animatedValueTag);
		});
	} };
}
function validateMapping(argMapping, args) {
	var validate = (recMapping, recEvt, key) => {
		if (recMapping instanceof AnimatedValue) {
			(0, import_invariant.default)(typeof recEvt === "number", "Bad mapping of event key " + key + ", should be number but got " + typeof recEvt);
			return;
		}
		if (typeof recEvt === "number") {
			(0, import_invariant.default)(recMapping instanceof AnimatedValue, "Bad mapping of type " + typeof recMapping + " for key " + key + ", event value must map to AnimatedValue");
			return;
		}
		(0, import_invariant.default)(typeof recMapping === "object", "Bad mapping of type " + typeof recMapping + " for key " + key);
		(0, import_invariant.default)(typeof recEvt === "object", "Bad event of type " + typeof recEvt + " for key " + key);
		for (var mappingKey in recMapping) validate(recMapping[mappingKey], recEvt[mappingKey], mappingKey);
	};
	(0, import_invariant.default)(args.length >= argMapping.length, "Event has less arguments than mapping");
	argMapping.forEach((mapping, idx) => {
		validate(mapping, args[idx], "arg" + idx);
	});
}
var AnimatedEvent = class {
	constructor(argMapping, config) {
		this._listeners = [];
		this._argMapping = argMapping;
		if (config == null) {
			console.warn("Animated.event now requires a second argument for options");
			config = { useNativeDriver: false };
		}
		if (config.listener) this.__addListener(config.listener);
		this._callListeners = this._callListeners.bind(this);
		this._attachedEvent = null;
		this.__isNative = shouldUseNativeDriver(config);
	}
	__addListener(callback) {
		this._listeners.push(callback);
	}
	__removeListener(callback) {
		this._listeners = this._listeners.filter((listener) => listener !== callback);
	}
	__attach(viewRef, eventName) {
		(0, import_invariant.default)(this.__isNative, "Only native driven events need to be attached.");
		this._attachedEvent = attachNativeEvent(viewRef, eventName, this._argMapping);
	}
	__detach(viewTag, eventName) {
		(0, import_invariant.default)(this.__isNative, "Only native driven events need to be detached.");
		this._attachedEvent && this._attachedEvent.detach();
	}
	__getHandler() {
		var _this = this;
		if (this.__isNative) {
			if (__DEV__) {
				var _validatedMapping = false;
				return function() {
					for (var _len = arguments.length, args = new Array(_len), _key2 = 0; _key2 < _len; _key2++) args[_key2] = arguments[_key2];
					if (!_validatedMapping) {
						validateMapping(_this._argMapping, args);
						_validatedMapping = true;
					}
					_this._callListeners(...args);
				};
			} else return this._callListeners;
		}
		var validatedMapping = false;
		return function() {
			for (var _len2 = arguments.length, args = new Array(_len2), _key3 = 0; _key3 < _len2; _key3++) args[_key3] = arguments[_key3];
			if (__DEV__ && !validatedMapping) {
				validateMapping(_this._argMapping, args);
				validatedMapping = true;
			}
			var traverse = (recMapping, recEvt, key) => {
				if (recMapping instanceof AnimatedValue) {
					if (typeof recEvt === "number") recMapping.setValue(recEvt);
				} else if (typeof recMapping === "object") for (var mappingKey in recMapping) traverse(recMapping[mappingKey], recEvt[mappingKey], mappingKey);
			};
			_this._argMapping.forEach((mapping, idx) => {
				traverse(mapping, args[idx], "arg" + idx);
			});
			_this._callListeners(...args);
		};
	}
	_callListeners() {
		for (var _len3 = arguments.length, args = new Array(_len3), _key4 = 0; _key4 < _len3; _key4++) args[_key4] = arguments[_key4];
		this._listeners.forEach((listener) => listener(...args));
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedTransform.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedTransform = class extends AnimatedWithChildren {
	constructor(transforms) {
		super();
		this._transforms = transforms;
	}
	__makeNative() {
		this._transforms.forEach((transform) => {
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) value.__makeNative();
			}
		});
		super.__makeNative();
	}
	__getValue() {
		return this._transforms.map((transform) => {
			var result = {};
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) result[key] = value.__getValue();
				else result[key] = value;
			}
			return result;
		});
	}
	__getAnimatedValue() {
		return this._transforms.map((transform) => {
			var result = {};
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) result[key] = value.__getAnimatedValue();
				else result[key] = value;
			}
			return result;
		});
	}
	__attach() {
		this._transforms.forEach((transform) => {
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) value.__addChild(this);
			}
		});
	}
	__detach() {
		this._transforms.forEach((transform) => {
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) value.__removeChild(this);
			}
		});
		super.__detach();
	}
	__getNativeConfig() {
		var transConfigs = [];
		this._transforms.forEach((transform) => {
			for (var key in transform) {
				var value = transform[key];
				if (value instanceof AnimatedNode) transConfigs.push({
					type: "animated",
					property: key,
					nodeTag: value.__getNativeTag()
				});
				else transConfigs.push({
					type: "static",
					property: key,
					value: NativeAnimatedHelper_default.transformDataType(value)
				});
			}
		});
		NativeAnimatedHelper_default.validateTransform(transConfigs);
		return {
			type: "transform",
			transforms: transConfigs
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedStyle.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var flattenStyle = stylesheet.flatten;
function createAnimatedStyle(inputStyle) {
	var style = flattenStyle(inputStyle);
	var animatedStyles = {};
	for (var key in style) {
		var value = style[key];
		if (key === "transform" && Array.isArray(value)) animatedStyles[key] = new AnimatedTransform(value);
		else if (value instanceof AnimatedNode) animatedStyles[key] = value;
		else if (value && !Array.isArray(value) && typeof value === "object") animatedStyles[key] = createAnimatedStyle(value);
	}
	return animatedStyles;
}
var AnimatedStyle = class extends AnimatedWithChildren {
	constructor(style) {
		super();
		this._inputStyle = style;
		this._style = createAnimatedStyle(style);
	}
	_walkStyleAndGetValues(style) {
		var updatedStyle = {};
		for (var key in style) {
			var value = style[key];
			if (value instanceof AnimatedNode) {
				if (!value.__isNative) updatedStyle[key] = value.__getValue();
			} else if (value && !Array.isArray(value) && typeof value === "object") updatedStyle[key] = this._walkStyleAndGetValues(value);
			else updatedStyle[key] = value;
		}
		return updatedStyle;
	}
	__getValue() {
		return [this._inputStyle, this._walkStyleAndGetValues(this._style)];
	}
	_walkStyleAndGetAnimatedValues(style) {
		var updatedStyle = {};
		for (var key in style) {
			var value = style[key];
			if (value instanceof AnimatedNode) updatedStyle[key] = value.__getAnimatedValue();
			else if (value && !Array.isArray(value) && typeof value === "object") updatedStyle[key] = this._walkStyleAndGetAnimatedValues(value);
		}
		return updatedStyle;
	}
	__getAnimatedValue() {
		return this._walkStyleAndGetAnimatedValues(this._style);
	}
	__attach() {
		for (var key in this._style) {
			var value = this._style[key];
			if (value instanceof AnimatedNode) value.__addChild(this);
		}
	}
	__detach() {
		for (var key in this._style) {
			var value = this._style[key];
			if (value instanceof AnimatedNode) value.__removeChild(this);
		}
		super.__detach();
	}
	__makeNative() {
		for (var key in this._style) {
			var value = this._style[key];
			if (value instanceof AnimatedNode) value.__makeNative();
		}
		super.__makeNative();
	}
	__getNativeConfig() {
		var styleConfig = {};
		for (var styleKey in this._style) if (this._style[styleKey] instanceof AnimatedNode) {
			var style = this._style[styleKey];
			style.__makeNative();
			styleConfig[styleKey] = style.__getNativeTag();
		}
		NativeAnimatedHelper_default.validateStyles(styleConfig);
		return {
			type: "style",
			style: styleConfig
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedProps.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedProps = class extends AnimatedNode {
	constructor(props, callback) {
		super();
		if (props.style) props = _objectSpread2(_objectSpread2({}, props), {}, { style: new AnimatedStyle(props.style) });
		this._props = props;
		this._callback = callback;
	}
	__getValue() {
		var props = {};
		for (var key in this._props) {
			var value = this._props[key];
			if (value instanceof AnimatedNode) {
				if (!value.__isNative || value instanceof AnimatedStyle) props[key] = value.__getValue();
			} else if (value instanceof AnimatedEvent) props[key] = value.__getHandler();
			else props[key] = value;
		}
		return props;
	}
	__getAnimatedValue() {
		var props = {};
		for (var key in this._props) {
			var value = this._props[key];
			if (value instanceof AnimatedNode) props[key] = value.__getAnimatedValue();
		}
		return props;
	}
	__attach() {
		for (var key in this._props) {
			var value = this._props[key];
			if (value instanceof AnimatedNode) value.__addChild(this);
		}
	}
	__detach() {
		if (this.__isNative && this._animatedView) this.__disconnectAnimatedView();
		this._animatedView = null;
		for (var key in this._props) {
			var value = this._props[key];
			if (value instanceof AnimatedNode) value.__removeChild(this);
		}
		super.__detach();
	}
	update() {
		this._callback();
	}
	__makeNative() {
		if (!this.__isNative) {
			this.__isNative = true;
			for (var key in this._props) {
				var value = this._props[key];
				if (value instanceof AnimatedNode) value.__makeNative();
			}
			if (this._animatedView) this.__connectAnimatedView();
		}
	}
	setNativeView(animatedView) {
		if (this._animatedView === animatedView) return;
		this._animatedView = animatedView;
		if (this.__isNative) this.__connectAnimatedView();
	}
	__connectAnimatedView() {
		(0, import_invariant.default)(this.__isNative, "Expected node to be marked as \"native\"");
		var nativeViewTag = this._animatedView;
		(0, import_invariant.default)(nativeViewTag != null, "Unable to locate attached view in the native tree");
		NativeAnimatedHelper_default.API.connectAnimatedNodeToView(this.__getNativeTag(), nativeViewTag);
	}
	__disconnectAnimatedView() {
		(0, import_invariant.default)(this.__isNative, "Expected node to be marked as \"native\"");
		var nativeViewTag = this._animatedView;
		(0, import_invariant.default)(nativeViewTag != null, "Unable to locate attached view in the native tree");
		NativeAnimatedHelper_default.API.disconnectAnimatedNodeFromView(this.__getNativeTag(), nativeViewTag);
	}
	__restoreDefaultValues() {
		if (this.__isNative) NativeAnimatedHelper_default.API.restoreDefaultValues(this.__getNativeTag());
	}
	__getNativeConfig() {
		var propsConfig = {};
		for (var propKey in this._props) {
			var value = this._props[propKey];
			if (value instanceof AnimatedNode) {
				value.__makeNative();
				propsConfig[propKey] = value.__getNativeTag();
			}
		}
		return {
			type: "props",
			props: propsConfig
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Utilities/useRefEffect.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* Constructs a callback ref that provides similar semantics as `useEffect`. The
* supplied `effect` callback will be called with non-null component instances.
* The `effect` callback can also optionally return a cleanup function.
*
* When a component is updated or unmounted, the cleanup function is called. The
* `effect` callback will then be called again, if applicable.
*
* When a new `effect` callback is supplied, the previously returned cleanup
* function will be called before the new `effect` callback is called with the
* same instance.
*
* WARNING: The `effect` callback should be stable (e.g. using `useCallback`).
*/
function useRefEffect(effect) {
	var cleanupRef = (0, import_react.useRef)(void 0);
	return (0, import_react.useCallback)((instance) => {
		if (cleanupRef.current) {
			cleanupRef.current();
			cleanupRef.current = void 0;
		}
		if (instance != null) cleanupRef.current = effect(instance);
	}, [effect]);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/useAnimatedProps.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
function useAnimatedProps(props) {
	var scheduleUpdate = (0, import_react.useReducer)((count) => count + 1, 0)[1];
	var onUpdateRef = (0, import_react.useRef)(null);
	var node = (0, import_react.useMemo)(() => new AnimatedProps(props, () => onUpdateRef.current == null ? void 0 : onUpdateRef.current()), [props]);
	useAnimatedPropsLifecycle(node);
	var callbackRef = useRefEffect((0, import_react.useCallback)((instance) => {
		node.setNativeView(instance);
		onUpdateRef.current = () => {
			scheduleUpdate();
		};
		var target = getEventTarget(instance);
		var events = [];
		for (var propName in props) {
			var propValue = props[propName];
			if (propValue instanceof AnimatedEvent && propValue.__isNative) {
				propValue.__attach(target, propName);
				events.push([propName, propValue]);
			}
		}
		return () => {
			onUpdateRef.current = null;
			for (var _i = 0, _events = events; _i < _events.length; _i++) {
				var _events$_i = _events[_i], _propName = _events$_i[0];
				_events$_i[1].__detach(target, _propName);
			}
		};
	}, [props, node]));
	return [reduceAnimatedProps(node), callbackRef];
}
function reduceAnimatedProps(node) {
	return _objectSpread2(_objectSpread2({}, node.__getValue()), {}, { collapsable: false });
}
/**
* Manages the lifecycle of the supplied `AnimatedProps` by invoking `__attach`
* and `__detach`. However, this is more complicated because `AnimatedProps`
* uses reference counting to determine when to recursively detach its children
* nodes. So in order to optimize this, we avoid detaching until the next attach
* unless we are unmounting.
*/
function useAnimatedPropsLifecycle(node) {
	var prevNodeRef = (0, import_react.useRef)(null);
	var isUnmountingRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		NativeAnimatedHelper_default.API.flushQueue();
	});
	useLayoutEffectImpl(() => {
		isUnmountingRef.current = false;
		return () => {
			isUnmountingRef.current = true;
		};
	}, []);
	useLayoutEffectImpl(() => {
		node.__attach();
		if (prevNodeRef.current != null) {
			var prevNode = prevNodeRef.current;
			prevNode.__restoreDefaultValues();
			prevNode.__detach();
			prevNodeRef.current = null;
		}
		return () => {
			if (isUnmountingRef.current) node.__detach();
			else prevNodeRef.current = node;
		};
	}, [node]);
}
function getEventTarget(instance) {
	return typeof instance === "object" && typeof (instance == null ? void 0 : instance.getScrollableNode) === "function" ? instance.getScrollableNode() : instance;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Utilities/useMergeRefs.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* Constructs a new ref that forwards new values to each of the given refs. The
* given refs will always be invoked in the order that they are supplied.
*
* WARNING: A known problem of merging refs using this approach is that if any
* of the given refs change, the returned callback ref will also be changed. If
* the returned callback ref is supplied as a `ref` to a React element, this may
* lead to problems with the given refs being invoked more times than desired.
*/
function useMergeRefs() {
	for (var _len = arguments.length, refs = new Array(_len), _key = 0; _key < _len; _key++) refs[_key] = arguments[_key];
	return (0, import_react.useCallback)((current) => {
		for (var _i = 0, _refs = refs; _i < _refs.length; _i++) {
			var ref = _refs[_i];
			if (ref != null) {
				if (typeof ref === "function") ref(current);
				else ref.current = current;
			}
		}
	}, [...refs]);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/createAnimatedComponent.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$18 = ["style"];
/**
* Experimental implementation of `createAnimatedComponent` that is intended to
* be compatible with concurrent rendering.
*/
function createAnimatedComponent(Component) {
	return /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
		var _useAnimatedProps = useAnimatedProps(props), reducedProps = _useAnimatedProps[0], callbackRef = _useAnimatedProps[1];
		var ref = useMergeRefs(callbackRef, forwardedRef);
		var passthroughAnimatedPropExplicitValues = reducedProps.passthroughAnimatedPropExplicitValues, style = reducedProps.style;
		var _ref = passthroughAnimatedPropExplicitValues !== null && passthroughAnimatedPropExplicitValues !== void 0 ? passthroughAnimatedPropExplicitValues : {}, passthroughStyle = _ref.style, passthroughProps = _objectWithoutPropertiesLoose(_ref, _excluded$18);
		var mergedStyle = [style, passthroughStyle];
		return /*#__PURE__*/ import_react.createElement(Component, _extends({}, reducedProps, passthroughProps, {
			style: mergedStyle,
			ref
		}));
	});
}
var AnimatedFlatList_default = createAnimatedComponent(/* @__PURE__ */ import_react.forwardRef((props, ref) => /*#__PURE__*/ import_react.createElement(FlatList_default, _extends({ scrollEventThrottle: 1e-4 }, props, { ref }))));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/AssetRegistry/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var assets = [];
function getAssetByID(assetId) {
	return assets[assetId - 1];
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/ImageLoader/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var dataUriPattern = /^data:/;
var ImageUriCache = class ImageUriCache {
	static has(uri) {
		var entries = ImageUriCache._entries;
		return dataUriPattern.test(uri) || Boolean(entries[uri]);
	}
	static add(uri) {
		var entries = ImageUriCache._entries;
		var lastUsedTimestamp = Date.now();
		if (entries[uri]) {
			entries[uri].lastUsedTimestamp = lastUsedTimestamp;
			entries[uri].refCount += 1;
		} else entries[uri] = {
			lastUsedTimestamp,
			refCount: 1
		};
	}
	static remove(uri) {
		var entries = ImageUriCache._entries;
		if (entries[uri]) entries[uri].refCount -= 1;
		ImageUriCache._cleanUpIfNeeded();
	}
	static _cleanUpIfNeeded() {
		var entries = ImageUriCache._entries;
		var imageUris = Object.keys(entries);
		if (imageUris.length + 1 > ImageUriCache._maximumEntries) {
			var leastRecentlyUsedKey;
			var leastRecentlyUsedEntry;
			imageUris.forEach((uri) => {
				var entry = entries[uri];
				if ((!leastRecentlyUsedEntry || entry.lastUsedTimestamp < leastRecentlyUsedEntry.lastUsedTimestamp) && entry.refCount === 0) {
					leastRecentlyUsedKey = uri;
					leastRecentlyUsedEntry = entry;
				}
			});
			if (leastRecentlyUsedKey) delete entries[leastRecentlyUsedKey];
		}
	}
};
ImageUriCache._maximumEntries = 256;
ImageUriCache._entries = {};
var id = 0;
var requests = {};
var ImageLoader = {
	abort(requestId) {
		var image = requests["" + requestId];
		if (image) {
			image.onerror = null;
			image.onload = null;
			image = null;
			delete requests["" + requestId];
		}
	},
	getSize(uri, success, failure) {
		var complete = false;
		var interval = setInterval(callback, 16);
		var requestId = ImageLoader.load(uri, callback, errorCallback);
		function callback() {
			var image = requests["" + requestId];
			if (image) {
				var naturalHeight = image.naturalHeight, naturalWidth = image.naturalWidth;
				if (naturalHeight && naturalWidth) {
					success(naturalWidth, naturalHeight);
					complete = true;
				}
			}
			if (complete) {
				ImageLoader.abort(requestId);
				clearInterval(interval);
			}
		}
		function errorCallback() {
			if (typeof failure === "function") failure();
			ImageLoader.abort(requestId);
			clearInterval(interval);
		}
	},
	has(uri) {
		return ImageUriCache.has(uri);
	},
	load(uri, onLoad, onError) {
		id += 1;
		var image = new window.Image();
		image.onerror = onError;
		image.onload = (e) => {
			var onDecode = () => onLoad({ nativeEvent: e });
			if (typeof image.decode === "function") image.decode().then(onDecode, onDecode);
			else setTimeout(onDecode, 0);
		};
		image.src = uri;
		requests["" + id] = image;
		return id;
	},
	prefetch(uri) {
		return new Promise((resolve, reject) => {
			ImageLoader.load(uri, () => {
				ImageUriCache.add(uri);
				ImageUriCache.remove(uri);
				resolve();
			}, reject);
		});
	},
	queryCache(uris) {
		var result = {};
		uris.forEach((u) => {
			if (ImageUriCache.has(u)) result[u] = "disk/memory";
		});
		return Promise.resolve(result);
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/PixelRatio/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* PixelRatio gives access to the device pixel density.
*/
var PixelRatio = class PixelRatio {
	/**
	* Returns the device pixel density.
	*/
	static get() {
		return Dimensions.get("window").scale;
	}
	/**
	* No equivalent for Web
	*/
	static getFontScale() {
		return Dimensions.get("window").fontScale || PixelRatio.get();
	}
	/**
	* Converts a layout size (dp) to pixel size (px).
	* Guaranteed to return an integer number.
	*/
	static getPixelSizeForLayoutSize(layoutSize) {
		return Math.round(layoutSize * PixelRatio.get());
	}
	/**
	* Rounds a layout size (dp) to the nearest layout size that corresponds to
	* an integer number of pixels. For example, on a device with a PixelRatio
	* of 3, `PixelRatio.roundToNearestPixel(8.4) = 8.33`, which corresponds to
	* exactly (8.33 * 3) = 25 pixels.
	*/
	static roundToNearestPixel(layoutSize) {
		var ratio = PixelRatio.get();
		return Math.round(layoutSize * ratio) / ratio;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Image/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$17 = [
	"aria-label",
	"accessibilityLabel",
	"blurRadius",
	"defaultSource",
	"draggable",
	"onError",
	"onLayout",
	"onLoad",
	"onLoadEnd",
	"onLoadStart",
	"pointerEvents",
	"source",
	"style"
];
var ERRORED = "ERRORED";
var LOADED = "LOADED";
var LOADING = "LOADING";
var IDLE = "IDLE";
var _filterId = 0;
var svgDataUriPattern = /^(data:image\/svg\+xml;utf8,)(.*)/;
function createTintColorSVG(tintColor, id) {
	return tintColor && id != null ? /*#__PURE__*/ import_react.createElement("svg", { style: {
		position: "absolute",
		height: 0,
		visibility: "hidden",
		width: 0
	} }, /*#__PURE__*/ import_react.createElement("defs", null, /*#__PURE__*/ import_react.createElement("filter", {
		id: "tint-" + id,
		suppressHydrationWarning: true
	}, /*#__PURE__*/ import_react.createElement("feFlood", {
		floodColor: "" + tintColor,
		key: tintColor
	}), /*#__PURE__*/ import_react.createElement("feComposite", {
		in2: "SourceAlpha",
		operator: "in"
	})))) : null;
}
function extractNonStandardStyleProps(style, blurRadius, filterId, tintColorProp) {
	var flatStyle = stylesheet.flatten(style);
	var filter = flatStyle.filter, resizeMode = flatStyle.resizeMode, shadowOffset = flatStyle.shadowOffset, tintColor = flatStyle.tintColor;
	if (flatStyle.resizeMode) warnOnce("Image.style.resizeMode", "Image: style.resizeMode is deprecated. Please use props.resizeMode.");
	if (flatStyle.tintColor) warnOnce("Image.style.tintColor", "Image: style.tintColor is deprecated. Please use props.tintColor.");
	var filters = [];
	var _filter = null;
	if (filter) filters.push(filter);
	if (blurRadius) filters.push("blur(" + blurRadius + "px)");
	if (shadowOffset) {
		var shadowString = createBoxShadowValue(flatStyle);
		if (shadowString) filters.push("drop-shadow(" + shadowString + ")");
	}
	if ((tintColorProp || tintColor) && filterId != null) filters.push("url(#tint-" + filterId + ")");
	if (filters.length > 0) _filter = filters.join(" ");
	return [
		resizeMode,
		_filter,
		tintColor
	];
}
function resolveAssetDimensions(source) {
	if (typeof source === "number") {
		var _getAssetByID = getAssetByID(source);
		return {
			height: _getAssetByID.height,
			width: _getAssetByID.width
		};
	} else if (source != null && !Array.isArray(source) && typeof source === "object") return {
		height: source.height,
		width: source.width
	};
}
function resolveAssetUri(source) {
	var uri = null;
	if (typeof source === "number") {
		var asset = getAssetByID(source);
		if (asset == null) throw new Error("Image: asset with ID \"" + source + "\" could not be found. Please check the image source or packager.");
		var scale = asset.scales[0];
		if (asset.scales.length > 1) {
			var preferredScale = PixelRatio.get();
			scale = asset.scales.reduce((prev, curr) => Math.abs(curr - preferredScale) < Math.abs(prev - preferredScale) ? curr : prev);
		}
		var scaleSuffix = scale !== 1 ? "@" + scale + "x" : "";
		uri = asset ? asset.httpServerLocation + "/" + asset.name + scaleSuffix + "." + asset.type : "";
	} else if (typeof source === "string") uri = source;
	else if (source && typeof source.uri === "string") uri = source.uri;
	if (uri) {
		var match = uri.match(svgDataUriPattern);
		if (match) {
			var prefix = match[1], svg = match[2];
			var encodedSvg = encodeURIComponent(svg);
			return "" + prefix + encodedSvg;
		}
	}
	return uri;
}
var Image = /*#__PURE__*/ import_react.forwardRef((props, ref) => {
	var _ariaLabel = props["aria-label"], accessibilityLabel = props.accessibilityLabel, blurRadius = props.blurRadius, defaultSource = props.defaultSource, draggable = props.draggable, onError = props.onError, onLayout = props.onLayout, onLoad = props.onLoad, onLoadEnd = props.onLoadEnd, onLoadStart = props.onLoadStart, pointerEvents = props.pointerEvents, source = props.source, style = props.style, rest = _objectWithoutPropertiesLoose(props, _excluded$17);
	var ariaLabel = _ariaLabel || accessibilityLabel;
	if (props.children) throw new Error("The <Image> component cannot contain children. If you want to render content on top of the image, consider using the <ImageBackground> component or absolute positioning.");
	var _React$useState = import_react.useState(() => {
		var uri = resolveAssetUri(source);
		if (uri != null) {
			if (ImageLoader.has(uri)) return LOADED;
		}
		return IDLE;
	}), state = _React$useState[0], updateState = _React$useState[1];
	var _React$useState2 = import_react.useState({}), layout = _React$useState2[0], updateLayout = _React$useState2[1];
	var hasTextAncestor = import_react.useContext(TextAncestorContext);
	var hiddenImageRef = import_react.useRef(null);
	var filterRef = import_react.useRef(_filterId++);
	var requestRef = import_react.useRef(null);
	var shouldDisplaySource = state === LOADED || state === LOADING && defaultSource == null;
	var _extractNonStandardSt = extractNonStandardStyleProps(style, blurRadius, filterRef.current, props.tintColor), _resizeMode = _extractNonStandardSt[0], filter = _extractNonStandardSt[1], _tintColor = _extractNonStandardSt[2];
	var resizeMode = props.resizeMode || _resizeMode || "cover";
	var tintColor = props.tintColor || _tintColor;
	var selectedSource = shouldDisplaySource ? source : defaultSource;
	var displayImageUri = resolveAssetUri(selectedSource);
	var imageSizeStyle = resolveAssetDimensions(selectedSource);
	var backgroundImage = displayImageUri ? "url(\"" + displayImageUri + "\")" : null;
	var backgroundSize = getBackgroundSize();
	var hiddenImage = displayImageUri ? createElement("img", {
		alt: ariaLabel || "",
		style: styles$16.accessibilityImage$raw,
		draggable: draggable || false,
		ref: hiddenImageRef,
		src: displayImageUri
	}) : null;
	function getBackgroundSize() {
		if (hiddenImageRef.current != null && (resizeMode === "center" || resizeMode === "repeat")) {
			var _hiddenImageRef$curre = hiddenImageRef.current, naturalHeight = _hiddenImageRef$curre.naturalHeight, naturalWidth = _hiddenImageRef$curre.naturalWidth;
			var _height3 = layout.height, _width3 = layout.width;
			if (naturalHeight && naturalWidth && _height3 && _width3) {
				var scaleFactor = Math.min(1, _width3 / naturalWidth, _height3 / naturalHeight);
				var x = Math.ceil(scaleFactor * naturalWidth);
				var y = Math.ceil(scaleFactor * naturalHeight);
				return x + "px " + y + "px";
			}
		}
	}
	function handleLayout(e) {
		if (resizeMode === "center" || resizeMode === "repeat" || onLayout) {
			var _layout = e.nativeEvent.layout;
			onLayout && onLayout(e);
			updateLayout(_layout);
		}
	}
	var uri = resolveAssetUri(source);
	import_react.useEffect(() => {
		abortPendingRequest();
		if (uri != null) {
			updateState(LOADING);
			if (onLoadStart) onLoadStart();
			requestRef.current = ImageLoader.load(uri, function load(e) {
				updateState(LOADED);
				if (onLoad) onLoad(e);
				if (onLoadEnd) onLoadEnd();
			}, function error() {
				updateState(ERRORED);
				if (onError) onError({ nativeEvent: { error: "Failed to load resource " + uri } });
				if (onLoadEnd) onLoadEnd();
			});
		}
		function abortPendingRequest() {
			if (requestRef.current != null) {
				ImageLoader.abort(requestRef.current);
				requestRef.current = null;
			}
		}
		return abortPendingRequest;
	}, [
		uri,
		requestRef,
		updateState,
		onError,
		onLoad,
		onLoadEnd,
		onLoadStart
	]);
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, {
		"aria-label": ariaLabel,
		onLayout: handleLayout,
		pointerEvents,
		ref,
		style: [
			styles$16.root,
			hasTextAncestor && styles$16.inline,
			imageSizeStyle,
			style,
			styles$16.undo,
			{ boxShadow: null }
		]
	}), /*#__PURE__*/ import_react.createElement(View, {
		style: [
			styles$16.image,
			resizeModeStyles[resizeMode],
			{
				backgroundImage,
				filter
			},
			backgroundSize != null && { backgroundSize }
		],
		suppressHydrationWarning: true
	}), hiddenImage, createTintColorSVG(tintColor, filterRef.current));
});
Image.displayName = "Image";
var ImageWithStatics = Image;
ImageWithStatics.getSize = function(uri, success, failure) {
	ImageLoader.getSize(uri, success, failure);
};
ImageWithStatics.prefetch = function(uri) {
	return ImageLoader.prefetch(uri);
};
ImageWithStatics.queryCache = function(uris) {
	return ImageLoader.queryCache(uris);
};
var styles$16 = stylesheet.create({
	root: {
		flexBasis: "auto",
		overflow: "hidden",
		zIndex: 0
	},
	inline: { display: "inline-flex" },
	undo: {
		blurRadius: null,
		shadowColor: null,
		shadowOpacity: null,
		shadowOffset: null,
		shadowRadius: null,
		tintColor: null,
		overlayColor: null,
		resizeMode: null
	},
	image: _objectSpread2(_objectSpread2({}, stylesheet.absoluteFillObject), {}, {
		backgroundColor: "transparent",
		backgroundPosition: "center",
		backgroundRepeat: "no-repeat",
		backgroundSize: "cover",
		height: "100%",
		width: "100%",
		zIndex: -1
	}),
	accessibilityImage$raw: _objectSpread2(_objectSpread2({}, stylesheet.absoluteFillObject), {}, {
		height: "100%",
		opacity: 0,
		width: "100%",
		zIndex: -1
	})
});
var resizeModeStyles = stylesheet.create({
	center: { backgroundSize: "auto" },
	contain: { backgroundSize: "contain" },
	cover: { backgroundSize: "cover" },
	none: {
		backgroundPosition: "0",
		backgroundSize: "auto"
	},
	repeat: {
		backgroundPosition: "0",
		backgroundRepeat: "repeat",
		backgroundSize: "auto"
	},
	stretch: { backgroundSize: "100% 100%" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/components/AnimatedImage.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedImage_default = createAnimatedComponent(ImageWithStatics);
var AnimatedScrollView_default = createAnimatedComponent(/* @__PURE__ */ import_react.forwardRef((props, ref) => /*#__PURE__*/ import_react.createElement(ForwardedScrollView, _extends({ scrollEventThrottle: 1e-4 }, props, { ref }))));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/VirtualizedSectionList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$16 = [
	"ItemSeparatorComponent",
	"SectionSeparatorComponent",
	"renderItem",
	"renderSectionFooter",
	"renderSectionHeader",
	"sections",
	"stickySectionHeadersEnabled"
];
/**
* Right now this just flattens everything into one list and uses VirtualizedList under the
* hood. The only operation that might not scale well is concatting the data arrays of all the
* sections when new props are received, which should be plenty fast for up to ~10,000 items.
*/
var VirtualizedSectionList = class extends import_react.PureComponent {
	constructor() {
		super(...arguments);
		this._keyExtractor = (item, index) => {
			var info = this._subExtractor(index);
			return info && info.key || String(index);
		};
		this._convertViewable = (viewable) => {
			var _info$index;
			(0, import_invariant.default)(viewable.index != null, "Received a broken ViewToken");
			var info = this._subExtractor(viewable.index);
			if (!info) return null;
			var keyExtractorWithNullableIndex = info.section.keyExtractor;
			var keyExtractorWithNonNullableIndex = this.props.keyExtractor || keyExtractor;
			var key = keyExtractorWithNullableIndex != null ? keyExtractorWithNullableIndex(viewable.item, info.index) : keyExtractorWithNonNullableIndex(viewable.item, (_info$index = info.index) !== null && _info$index !== void 0 ? _info$index : 0);
			return _objectSpread2(_objectSpread2({}, viewable), {}, {
				index: info.index,
				key,
				section: info.section
			});
		};
		this._onViewableItemsChanged = (_ref) => {
			var viewableItems = _ref.viewableItems, changed = _ref.changed;
			var onViewableItemsChanged = this.props.onViewableItemsChanged;
			if (onViewableItemsChanged != null) onViewableItemsChanged({
				viewableItems: viewableItems.map(this._convertViewable, this).filter(Boolean),
				changed: changed.map(this._convertViewable, this).filter(Boolean)
			});
		};
		this._renderItem = (listItemCount) => (_ref2) => {
			var item = _ref2.item, index = _ref2.index;
			var info = this._subExtractor(index);
			if (!info) return null;
			var infoIndex = info.index;
			if (infoIndex == null) {
				var section = info.section;
				if (info.header === true) {
					var renderSectionHeader = this.props.renderSectionHeader;
					return renderSectionHeader ? renderSectionHeader({ section }) : null;
				} else {
					var renderSectionFooter = this.props.renderSectionFooter;
					return renderSectionFooter ? renderSectionFooter({ section }) : null;
				}
			} else {
				var renderItem = info.section.renderItem || this.props.renderItem;
				var SeparatorComponent = this._getSeparatorComponent(index, info, listItemCount);
				(0, import_invariant.default)(renderItem, "no renderItem!");
				return /*#__PURE__*/ import_react.createElement(ItemWithSeparator, {
					SeparatorComponent,
					LeadingSeparatorComponent: infoIndex === 0 ? this.props.SectionSeparatorComponent : void 0,
					cellKey: info.key,
					index: infoIndex,
					item,
					leadingItem: info.leadingItem,
					leadingSection: info.leadingSection,
					prevCellKey: (this._subExtractor(index - 1) || {}).key,
					setSelfHighlightCallback: this._setUpdateHighlightFor,
					setSelfUpdatePropsCallback: this._setUpdatePropsFor,
					updateHighlightFor: this._updateHighlightFor,
					updatePropsFor: this._updatePropsFor,
					renderItem,
					section: info.section,
					trailingItem: info.trailingItem,
					trailingSection: info.trailingSection,
					inverted: !!this.props.inverted
				});
			}
		};
		this._updatePropsFor = (cellKey, value) => {
			var updateProps = this._updatePropsMap[cellKey];
			if (updateProps != null) updateProps(value);
		};
		this._updateHighlightFor = (cellKey, value) => {
			var updateHighlight = this._updateHighlightMap[cellKey];
			if (updateHighlight != null) updateHighlight(value);
		};
		this._setUpdateHighlightFor = (cellKey, updateHighlightFn) => {
			if (updateHighlightFn != null) this._updateHighlightMap[cellKey] = updateHighlightFn;
			else delete this._updateHighlightFor[cellKey];
		};
		this._setUpdatePropsFor = (cellKey, updatePropsFn) => {
			if (updatePropsFn != null) this._updatePropsMap[cellKey] = updatePropsFn;
			else delete this._updatePropsMap[cellKey];
		};
		this._updateHighlightMap = {};
		this._updatePropsMap = {};
		this._captureRef = (ref) => {
			this._listRef = ref;
		};
	}
	scrollToLocation(params) {
		var index = params.itemIndex;
		for (var i = 0; i < params.sectionIndex; i++) index += this.props.getItemCount(this.props.sections[i].data) + 2;
		var viewOffset = params.viewOffset || 0;
		if (this._listRef == null) return;
		if (params.itemIndex > 0 && this.props.stickySectionHeadersEnabled) {
			var frame = this._listRef.__getFrameMetricsApprox(index - params.itemIndex, this._listRef.props);
			viewOffset += frame.length;
		}
		var toIndexParams = _objectSpread2(_objectSpread2({}, params), {}, {
			viewOffset,
			index
		});
		this._listRef.scrollToIndex(toIndexParams);
	}
	getListRef() {
		return this._listRef;
	}
	render() {
		var _this$props = this.props;
		_this$props.ItemSeparatorComponent;
		_this$props.SectionSeparatorComponent;
		_this$props.renderItem;
		_this$props.renderSectionFooter;
		_this$props.renderSectionHeader;
		_this$props.sections;
		_this$props.stickySectionHeadersEnabled;
		var passThroughProps = _objectWithoutPropertiesLoose(_this$props, _excluded$16);
		var listHeaderOffset = this.props.ListHeaderComponent ? 1 : 0;
		var stickyHeaderIndices = this.props.stickySectionHeadersEnabled ? [] : void 0;
		var itemCount = 0;
		for (var _iterator = _createForOfIteratorHelperLoose(this.props.sections), _step; !(_step = _iterator()).done;) {
			var section = _step.value;
			if (stickyHeaderIndices != null) stickyHeaderIndices.push(itemCount + listHeaderOffset);
			itemCount += 2;
			itemCount += this.props.getItemCount(section.data);
		}
		var renderItem = this._renderItem(itemCount);
		return /*#__PURE__*/ import_react.createElement(VirtualizedList, _extends({}, passThroughProps, {
			keyExtractor: this._keyExtractor,
			stickyHeaderIndices,
			renderItem,
			data: this.props.sections,
			getItem: (sections, index) => this._getItem(this.props, sections, index),
			getItemCount: () => itemCount,
			onViewableItemsChanged: this.props.onViewableItemsChanged ? this._onViewableItemsChanged : void 0,
			ref: this._captureRef
		}));
	}
	_getItem(props, sections, index) {
		if (!sections) return null;
		var itemIdx = index - 1;
		for (var i = 0; i < sections.length; i++) {
			var section = sections[i];
			var sectionData = section.data;
			var itemCount = props.getItemCount(sectionData);
			if (itemIdx === -1 || itemIdx === itemCount) return section;
			else if (itemIdx < itemCount) return props.getItem(sectionData, itemIdx);
			else itemIdx -= itemCount + 2;
		}
		return null;
	}
	_subExtractor(index) {
		var itemIndex = index;
		var _this$props2 = this.props, getItem = _this$props2.getItem, getItemCount = _this$props2.getItemCount, keyExtractor$1 = _this$props2.keyExtractor, sections = _this$props2.sections;
		for (var i = 0; i < sections.length; i++) {
			var section = sections[i];
			var sectionData = section.data;
			var key = section.key || String(i);
			itemIndex -= 1;
			if (itemIndex >= getItemCount(sectionData) + 1) itemIndex -= getItemCount(sectionData) + 1;
			else if (itemIndex === -1) return {
				section,
				key: key + ":header",
				index: null,
				header: true,
				trailingSection: sections[i + 1]
			};
			else if (itemIndex === getItemCount(sectionData)) return {
				section,
				key: key + ":footer",
				index: null,
				header: false,
				trailingSection: sections[i + 1]
			};
			else {
				var extractor = section.keyExtractor || keyExtractor$1 || keyExtractor;
				return {
					section,
					key: key + ":" + extractor(getItem(sectionData, itemIndex), itemIndex),
					index: itemIndex,
					leadingItem: getItem(sectionData, itemIndex - 1),
					leadingSection: sections[i - 1],
					trailingItem: getItem(sectionData, itemIndex + 1),
					trailingSection: sections[i + 1]
				};
			}
		}
	}
	_getSeparatorComponent(index, info, listItemCount) {
		info = info || this._subExtractor(index);
		if (!info) return null;
		var ItemSeparatorComponent = info.section.ItemSeparatorComponent || this.props.ItemSeparatorComponent;
		var SectionSeparatorComponent = this.props.SectionSeparatorComponent;
		var isLastItemInList = index === listItemCount - 1;
		var isLastItemInSection = info.index === this.props.getItemCount(info.section.data) - 1;
		if (SectionSeparatorComponent && isLastItemInSection) return SectionSeparatorComponent;
		if (ItemSeparatorComponent && !isLastItemInSection && !isLastItemInList) return ItemSeparatorComponent;
		return null;
	}
};
function ItemWithSeparator(props) {
	var LeadingSeparatorComponent = props.LeadingSeparatorComponent, SeparatorComponent = props.SeparatorComponent, cellKey = props.cellKey, prevCellKey = props.prevCellKey, setSelfHighlightCallback = props.setSelfHighlightCallback, updateHighlightFor = props.updateHighlightFor, setSelfUpdatePropsCallback = props.setSelfUpdatePropsCallback, updatePropsFor = props.updatePropsFor, item = props.item, index = props.index, section = props.section, inverted = props.inverted;
	var _React$useState = import_react.useState(false), leadingSeparatorHiglighted = _React$useState[0], setLeadingSeparatorHighlighted = _React$useState[1];
	var _React$useState2 = import_react.useState(false), separatorHighlighted = _React$useState2[0], setSeparatorHighlighted = _React$useState2[1];
	var _React$useState3 = import_react.useState({
		leadingItem: props.leadingItem,
		leadingSection: props.leadingSection,
		section: props.section,
		trailingItem: props.item,
		trailingSection: props.trailingSection
	}), leadingSeparatorProps = _React$useState3[0], setLeadingSeparatorProps = _React$useState3[1];
	var _React$useState4 = import_react.useState({
		leadingItem: props.item,
		leadingSection: props.leadingSection,
		section: props.section,
		trailingItem: props.trailingItem,
		trailingSection: props.trailingSection
	}), separatorProps = _React$useState4[0], setSeparatorProps = _React$useState4[1];
	import_react.useEffect(() => {
		setSelfHighlightCallback(cellKey, setSeparatorHighlighted);
		setSelfUpdatePropsCallback(cellKey, setSeparatorProps);
		return () => {
			setSelfUpdatePropsCallback(cellKey, null);
			setSelfHighlightCallback(cellKey, null);
		};
	}, [
		cellKey,
		setSelfHighlightCallback,
		setSeparatorProps,
		setSelfUpdatePropsCallback
	]);
	var element = props.renderItem({
		item,
		index,
		section,
		separators: {
			highlight: () => {
				setLeadingSeparatorHighlighted(true);
				setSeparatorHighlighted(true);
				if (prevCellKey != null) updateHighlightFor(prevCellKey, true);
			},
			unhighlight: () => {
				setLeadingSeparatorHighlighted(false);
				setSeparatorHighlighted(false);
				if (prevCellKey != null) updateHighlightFor(prevCellKey, false);
			},
			updateProps: (select, newProps) => {
				if (select === "leading") {
					if (LeadingSeparatorComponent != null) setLeadingSeparatorProps(_objectSpread2(_objectSpread2({}, leadingSeparatorProps), newProps));
					else if (prevCellKey != null) updatePropsFor(prevCellKey, _objectSpread2(_objectSpread2({}, leadingSeparatorProps), newProps));
				} else if (select === "trailing" && SeparatorComponent != null) setSeparatorProps(_objectSpread2(_objectSpread2({}, separatorProps), newProps));
			}
		}
	});
	var leadingSeparator = LeadingSeparatorComponent != null && /*#__PURE__*/ import_react.createElement(LeadingSeparatorComponent, _extends({ highlighted: leadingSeparatorHiglighted }, leadingSeparatorProps));
	var separator = SeparatorComponent != null && /*#__PURE__*/ import_react.createElement(SeparatorComponent, _extends({ highlighted: separatorHighlighted }, separatorProps));
	return leadingSeparator || separator ? /*#__PURE__*/ import_react.createElement(View, null, inverted === false ? leadingSeparator : separator, element, inverted === false ? separator : leadingSeparator) : element;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/SectionList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$15 = ["stickySectionHeadersEnabled"];
/**
* A performant interface for rendering sectioned lists, supporting the most handy features:
*
*  - Fully cross-platform.
*  - Configurable viewability callbacks.
*  - List header support.
*  - List footer support.
*  - Item separator support.
*  - Section header support.
*  - Section separator support.
*  - Heterogeneous data and item rendering support.
*  - Pull to Refresh.
*  - Scroll loading.
*
* If you don't need section support and want a simpler interface, use
* [`<FlatList>`](https://reactnative.dev/docs/flatlist).
*
* Simple Examples:
*
*     <SectionList
*       renderItem={({item}) => <ListItem title={item} />}
*       renderSectionHeader={({section}) => <Header title={section.title} />}
*       sections={[ // homogeneous rendering between sections
*         {data: [...], title: ...},
*         {data: [...], title: ...},
*         {data: [...], title: ...},
*       ]}
*     />
*
*     <SectionList
*       sections={[ // heterogeneous rendering between sections
*         {data: [...], renderItem: ...},
*         {data: [...], renderItem: ...},
*         {data: [...], renderItem: ...},
*       ]}
*     />
*
* This is a convenience wrapper around [`<VirtualizedList>`](docs/virtualizedlist),
* and thus inherits its props (as well as those of `ScrollView`) that aren't explicitly listed
* here, along with the following caveats:
*
* - Internal state is not preserved when content scrolls out of the render window. Make sure all
*   your data is captured in the item data or external stores like Flux, Redux, or Relay.
* - This is a `PureComponent` which means that it will not re-render if `props` remain shallow-
*   equal. Make sure that everything your `renderItem` function depends on is passed as a prop
*   (e.g. `extraData`) that is not `===` after updates, otherwise your UI may not update on
*   changes. This includes the `data` prop and parent component state.
* - In order to constrain memory and enable smooth scrolling, content is rendered asynchronously
*   offscreen. This means it's possible to scroll faster than the fill rate and momentarily see
*   blank content. This is a tradeoff that can be adjusted to suit the needs of each application,
*   and we are working on improving it behind the scenes.
* - By default, the list looks for a `key` prop on each item and uses that for the React key.
*   Alternatively, you can provide a custom `keyExtractor` prop.
*
*/
var SectionList = class extends import_react.PureComponent {
	constructor() {
		super(...arguments);
		this._captureRef = (ref) => {
			this._wrapperListRef = ref;
		};
	}
	/**
	* Scrolls to the item at the specified `sectionIndex` and `itemIndex` (within the section)
	* positioned in the viewable area such that `viewPosition` 0 places it at the top (and may be
	* covered by a sticky header), 1 at the bottom, and 0.5 centered in the middle. `viewOffset` is a
	* fixed number of pixels to offset the final target position, e.g. to compensate for sticky
	* headers.
	*
	* Note: cannot scroll to locations outside the render window without specifying the
	* `getItemLayout` prop.
	*/
	scrollToLocation(params) {
		if (this._wrapperListRef != null) this._wrapperListRef.scrollToLocation(params);
	}
	/**
	* Tells the list an interaction has occurred, which should trigger viewability calculations, e.g.
	* if `waitForInteractions` is true and the user has not scrolled. This is typically called by
	* taps on items or by navigation actions.
	*/
	recordInteraction() {
		var listRef = this._wrapperListRef && this._wrapperListRef.getListRef();
		listRef && listRef.recordInteraction();
	}
	/**
	* Displays the scroll indicators momentarily.
	*
	* @platform ios
	*/
	flashScrollIndicators() {
		var listRef = this._wrapperListRef && this._wrapperListRef.getListRef();
		listRef && listRef.flashScrollIndicators();
	}
	/**
	* Provides a handle to the underlying scroll responder.
	*/
	getScrollResponder() {
		var listRef = this._wrapperListRef && this._wrapperListRef.getListRef();
		if (listRef) return listRef.getScrollResponder();
	}
	getScrollableNode() {
		var listRef = this._wrapperListRef && this._wrapperListRef.getListRef();
		if (listRef) return listRef.getScrollableNode();
	}
	render() {
		var _this$props = this.props, _stickySectionHeadersEnabled = _this$props.stickySectionHeadersEnabled, restProps = _objectWithoutPropertiesLoose(_this$props, _excluded$15);
		var stickySectionHeadersEnabled = _stickySectionHeadersEnabled !== null && _stickySectionHeadersEnabled !== void 0 ? _stickySectionHeadersEnabled : Platform.OS === "ios";
		return /*#__PURE__*/ import_react.createElement(VirtualizedSectionList, _extends({}, restProps, {
			stickySectionHeadersEnabled,
			ref: this._captureRef,
			getItemCount: (items) => items.length,
			getItem: (items, index) => items[index]
		}));
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/SectionList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var SectionList_default = SectionList;
var AnimatedSectionList_default = createAnimatedComponent(/* @__PURE__ */ import_react.forwardRef((props, ref) => /*#__PURE__*/ import_react.createElement(SectionList_default, _extends({ scrollEventThrottle: 1e-4 }, props, { ref }))));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Text/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$14 = [
	"hrefAttrs",
	"numberOfLines",
	"onClick",
	"onLayout",
	"onPress",
	"onMoveShouldSetResponder",
	"onMoveShouldSetResponderCapture",
	"onResponderEnd",
	"onResponderGrant",
	"onResponderMove",
	"onResponderReject",
	"onResponderRelease",
	"onResponderStart",
	"onResponderTerminate",
	"onResponderTerminationRequest",
	"onScrollShouldSetResponder",
	"onScrollShouldSetResponderCapture",
	"onSelectionChangeShouldSetResponder",
	"onSelectionChangeShouldSetResponderCapture",
	"onStartShouldSetResponder",
	"onStartShouldSetResponderCapture",
	"selectable"
];
var forwardPropsList$2 = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
	href: true,
	lang: true,
	pointerEvents: true
});
var pickProps$2 = (props) => pick(props, forwardPropsList$2);
var Text = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var hrefAttrs = props.hrefAttrs, numberOfLines = props.numberOfLines, onClick = props.onClick, onLayout = props.onLayout, onPress = props.onPress, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, selectable = props.selectable, rest = _objectWithoutPropertiesLoose(props, _excluded$14);
	var hasTextAncestor = import_react.useContext(TextAncestorContext);
	var hostRef = import_react.useRef(null);
	var contextDirection = useLocaleContext().direction;
	useElementLayout(hostRef, onLayout);
	useResponderEvents(hostRef, {
		onMoveShouldSetResponder,
		onMoveShouldSetResponderCapture,
		onResponderEnd,
		onResponderGrant,
		onResponderMove,
		onResponderReject,
		onResponderRelease,
		onResponderStart,
		onResponderTerminate,
		onResponderTerminationRequest,
		onScrollShouldSetResponder,
		onScrollShouldSetResponderCapture,
		onSelectionChangeShouldSetResponder,
		onSelectionChangeShouldSetResponderCapture,
		onStartShouldSetResponder,
		onStartShouldSetResponderCapture
	});
	var handleClick = import_react.useCallback((e) => {
		if (onClick != null) onClick(e);
		else if (onPress != null) {
			e.stopPropagation();
			onPress(e);
		}
	}, [onClick, onPress]);
	var component = hasTextAncestor ? "span" : "div";
	var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
	var componentDirection = props.dir || langDirection;
	var writingDirection = componentDirection || contextDirection;
	var supportedProps = pickProps$2(rest);
	supportedProps.dir = componentDirection;
	if (!hasTextAncestor) supportedProps.dir = componentDirection != null ? componentDirection : "auto";
	if (onClick || onPress) supportedProps.onClick = handleClick;
	supportedProps.style = [
		numberOfLines != null && numberOfLines > 1 && { WebkitLineClamp: numberOfLines },
		hasTextAncestor === true ? styles$15.textHasAncestor$raw : styles$15.text$raw,
		numberOfLines === 1 && styles$15.textOneLine,
		numberOfLines != null && numberOfLines > 1 && styles$15.textMultiLine,
		props.style,
		selectable === true && styles$15.selectable,
		selectable === false && styles$15.notSelectable,
		onPress && styles$15.pressable
	];
	if (props.href != null) {
		component = "a";
		if (hrefAttrs != null) {
			var download = hrefAttrs.download, rel = hrefAttrs.rel, target = hrefAttrs.target;
			if (download != null) supportedProps.download = download;
			if (rel != null) supportedProps.rel = rel;
			if (typeof target === "string") supportedProps.target = target.charAt(0) !== "_" ? "_" + target : target;
		}
	}
	supportedProps.ref = useMergeRefs$1(hostRef, usePlatformMethods(supportedProps), forwardedRef);
	var element = createElement(component, supportedProps, { writingDirection });
	return hasTextAncestor ? element : /*#__PURE__*/ import_react.createElement(TextAncestorContext.Provider, { value: true }, element);
});
Text.displayName = "Text";
var textStyle = {
	backgroundColor: "transparent",
	border: "0 solid black",
	boxSizing: "border-box",
	color: "black",
	display: "inline",
	font: "14px System",
	listStyle: "none",
	margin: 0,
	padding: 0,
	position: "relative",
	textAlign: "start",
	textDecoration: "none",
	whiteSpace: "pre-wrap",
	wordWrap: "break-word"
};
var styles$15 = stylesheet.create({
	text$raw: textStyle,
	textHasAncestor$raw: _objectSpread2(_objectSpread2({}, textStyle), {}, {
		color: "inherit",
		font: "inherit",
		textAlign: "inherit",
		whiteSpace: "inherit"
	}),
	textOneLine: {
		maxWidth: "100%",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		wordWrap: "normal"
	},
	textMultiLine: {
		display: "-webkit-box",
		maxWidth: "100%",
		overflow: "clip",
		textOverflow: "ellipsis",
		WebkitBoxOrient: "vertical"
	},
	notSelectable: { userSelect: "none" },
	selectable: { userSelect: "text" },
	pressable: { cursor: "pointer" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/components/AnimatedText.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedText_default = createAnimatedComponent(Text);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/components/AnimatedView.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedView_default = createAnimatedComponent(View);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedAddition.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedAddition = class extends AnimatedWithChildren {
	constructor(a, b) {
		super();
		this._a = typeof a === "number" ? new AnimatedValue(a) : a;
		this._b = typeof b === "number" ? new AnimatedValue(b) : b;
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		this._b.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		return this._a.__getValue() + this._b.__getValue();
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._a.__addChild(this);
		this._b.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		this._b.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "addition",
			input: [this._a.__getNativeTag(), this._b.__getNativeTag()]
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedDiffClamp.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedDiffClamp = class extends AnimatedWithChildren {
	constructor(a, min, max) {
		super();
		this._a = a;
		this._min = min;
		this._max = max;
		this._value = this._lastValue = this._a.__getValue();
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__getValue() {
		var value = this._a.__getValue();
		var diff = value - this._lastValue;
		this._lastValue = value;
		this._value = Math.min(Math.max(this._value + diff, this._min), this._max);
		return this._value;
	}
	__attach() {
		this._a.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "diffclamp",
			input: this._a.__getNativeTag(),
			min: this._min,
			max: this._max
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedDivision.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedDivision = class extends AnimatedWithChildren {
	constructor(a, b) {
		super();
		this._warnedAboutDivideByZero = false;
		if (b === 0 || b instanceof AnimatedNode && b.__getValue() === 0) console.error("Detected potential division by zero in AnimatedDivision");
		this._a = typeof a === "number" ? new AnimatedValue(a) : a;
		this._b = typeof b === "number" ? new AnimatedValue(b) : b;
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		this._b.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		var a = this._a.__getValue();
		var b = this._b.__getValue();
		if (b === 0) {
			if (!this._warnedAboutDivideByZero) {
				console.error("Detected division by zero in AnimatedDivision");
				this._warnedAboutDivideByZero = true;
			}
			return 0;
		}
		this._warnedAboutDivideByZero = false;
		return a / b;
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._a.__addChild(this);
		this._b.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		this._b.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "division",
			input: [this._a.__getNativeTag(), this._b.__getNativeTag()]
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedModulo.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedModulo = class extends AnimatedWithChildren {
	constructor(a, modulus) {
		super();
		this._a = a;
		this._modulus = modulus;
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		return (this._a.__getValue() % this._modulus + this._modulus) % this._modulus;
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._a.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "modulus",
			input: this._a.__getNativeTag(),
			modulus: this._modulus
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedMultiplication.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedMultiplication = class extends AnimatedWithChildren {
	constructor(a, b) {
		super();
		this._a = typeof a === "number" ? new AnimatedValue(a) : a;
		this._b = typeof b === "number" ? new AnimatedValue(b) : b;
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		this._b.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		return this._a.__getValue() * this._b.__getValue();
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._a.__addChild(this);
		this._b.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		this._b.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "multiplication",
			input: [this._a.__getNativeTag(), this._b.__getNativeTag()]
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedSubtraction.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedSubtraction = class extends AnimatedWithChildren {
	constructor(a, b) {
		super();
		this._a = typeof a === "number" ? new AnimatedValue(a) : a;
		this._b = typeof b === "number" ? new AnimatedValue(b) : b;
	}
	__makeNative(platformConfig) {
		this._a.__makeNative(platformConfig);
		this._b.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getValue() {
		return this._a.__getValue() - this._b.__getValue();
	}
	interpolate(config) {
		return new AnimatedInterpolation(this, config);
	}
	__attach() {
		this._a.__addChild(this);
		this._b.__addChild(this);
	}
	__detach() {
		this._a.__removeChild(this);
		this._b.__removeChild(this);
		super.__detach();
	}
	__getNativeConfig() {
		return {
			type: "subtraction",
			input: [this._a.__getNativeTag(), this._b.__getNativeTag()]
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedTracking.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var AnimatedTracking = class extends AnimatedNode {
	constructor(value, parent, animationClass, animationConfig, callback) {
		super();
		this._value = value;
		this._parent = parent;
		this._animationClass = animationClass;
		this._animationConfig = animationConfig;
		this._useNativeDriver = shouldUseNativeDriver(animationConfig);
		this._callback = callback;
		this.__attach();
	}
	__makeNative() {
		this.__isNative = true;
		this._parent.__makeNative();
		super.__makeNative();
		this._value.__makeNative();
	}
	__getValue() {
		return this._parent.__getValue();
	}
	__attach() {
		this._parent.__addChild(this);
		if (this._useNativeDriver) this.__makeNative();
	}
	__detach() {
		this._parent.__removeChild(this);
		super.__detach();
	}
	update() {
		this._value.animate(new this._animationClass(_objectSpread2(_objectSpread2({}, this._animationConfig), {}, { toValue: this._animationConfig.toValue.__getValue() })), this._callback);
	}
	__getNativeConfig() {
		var animationConfig = new this._animationClass(_objectSpread2(_objectSpread2({}, this._animationConfig), {}, { toValue: void 0 })).__getNativeAnimationConfig();
		return {
			type: "tracking",
			animationId: generateNewAnimationId(),
			animationConfig,
			toValue: this._parent.__getNativeTag(),
			value: this._value.__getNativeTag()
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedValueXY.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _uniqueId$1 = 1;
/**
* 2D Value for driving 2D animations, such as pan gestures. Almost identical
* API to normal `Animated.Value`, but multiplexed.
*
* See https://reactnative.dev/docs/animatedvaluexy.html
*/
var AnimatedValueXY = class extends AnimatedWithChildren {
	constructor(valueIn) {
		super();
		var value = valueIn || {
			x: 0,
			y: 0
		};
		if (typeof value.x === "number" && typeof value.y === "number") {
			this.x = new AnimatedValue(value.x);
			this.y = new AnimatedValue(value.y);
		} else {
			(0, import_invariant.default)(value.x instanceof AnimatedValue && value.y instanceof AnimatedValue, "AnimatedValueXY must be initialized with an object of numbers or AnimatedValues.");
			this.x = value.x;
			this.y = value.y;
		}
		this._listeners = {};
	}
	/**
	* Directly set the value. This will stop any animations running on the value
	* and update all the bound properties.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#setvalue
	*/
	setValue(value) {
		this.x.setValue(value.x);
		this.y.setValue(value.y);
	}
	/**
	* Sets an offset that is applied on top of whatever value is set, whether
	* via `setValue`, an animation, or `Animated.event`. Useful for compensating
	* things like the start of a pan gesture.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#setoffset
	*/
	setOffset(offset) {
		this.x.setOffset(offset.x);
		this.y.setOffset(offset.y);
	}
	/**
	* Merges the offset value into the base value and resets the offset to zero.
	* The final output of the value is unchanged.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#flattenoffset
	*/
	flattenOffset() {
		this.x.flattenOffset();
		this.y.flattenOffset();
	}
	/**
	* Sets the offset value to the base value, and resets the base value to
	* zero. The final output of the value is unchanged.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#extractoffset
	*/
	extractOffset() {
		this.x.extractOffset();
		this.y.extractOffset();
	}
	__getValue() {
		return {
			x: this.x.__getValue(),
			y: this.y.__getValue()
		};
	}
	/**
	* Stops any animation and resets the value to its original.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#resetanimation
	*/
	resetAnimation(callback) {
		this.x.resetAnimation();
		this.y.resetAnimation();
		callback && callback(this.__getValue());
	}
	/**
	* Stops any running animation or tracking. `callback` is invoked with the
	* final value after stopping the animation, which is useful for updating
	* state to match the animation position with layout.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#stopanimation
	*/
	stopAnimation(callback) {
		this.x.stopAnimation();
		this.y.stopAnimation();
		callback && callback(this.__getValue());
	}
	/**
	* Adds an asynchronous listener to the value so you can observe updates from
	* animations.  This is useful because there is no way to synchronously read
	* the value because it might be driven natively.
	*
	* Returns a string that serves as an identifier for the listener.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#addlistener
	*/
	addListener(callback) {
		var id = String(_uniqueId$1++);
		var jointCallback = (_ref) => {
			_ref.value;
			callback(this.__getValue());
		};
		this._listeners[id] = {
			x: this.x.addListener(jointCallback),
			y: this.y.addListener(jointCallback)
		};
		return id;
	}
	/**
	* Unregister a listener. The `id` param shall match the identifier
	* previously returned by `addListener()`.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#removelistener
	*/
	removeListener(id) {
		this.x.removeListener(this._listeners[id].x);
		this.y.removeListener(this._listeners[id].y);
		delete this._listeners[id];
	}
	/**
	* Remove all registered listeners.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#removealllisteners
	*/
	removeAllListeners() {
		this.x.removeAllListeners();
		this.y.removeAllListeners();
		this._listeners = {};
	}
	/**
	* Converts `{x, y}` into `{left, top}` for use in style.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#getlayout
	*/
	getLayout() {
		return {
			left: this.x,
			top: this.y
		};
	}
	/**
	* Converts `{x, y}` into a useable translation transform.
	*
	* See https://reactnative.dev/docs/animatedvaluexy.html#gettranslatetransform
	*/
	getTranslateTransform() {
		return [{ translateX: this.x }, { translateY: this.y }];
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/animations/Animation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var startNativeAnimationNextId = 1;
var Animation = class {
	start(fromValue, onUpdate, onEnd, previousAnimation, animatedValue) {}
	stop() {
		if (this.__nativeId) NativeAnimatedHelper_default.API.stopAnimation(this.__nativeId);
	}
	__getNativeAnimationConfig() {
		throw new Error("This animation type cannot be offloaded to native");
	}
	__debouncedOnEnd(result) {
		var onEnd = this.__onEnd;
		this.__onEnd = null;
		onEnd && onEnd(result);
	}
	__startNativeAnimation(animatedValue) {
		var startNativeAnimationWaitId = startNativeAnimationNextId + ":startAnimation";
		startNativeAnimationNextId += 1;
		NativeAnimatedHelper_default.API.setWaitingForIdentifier(startNativeAnimationWaitId);
		try {
			var config = this.__getNativeAnimationConfig();
			animatedValue.__makeNative(config.platformConfig);
			this.__nativeId = NativeAnimatedHelper_default.generateNewAnimationId();
			NativeAnimatedHelper_default.API.startAnimatingNode(this.__nativeId, animatedValue.__getNativeTag(), config, this.__debouncedOnEnd.bind(this));
		} catch (e) {
			throw e;
		} finally {
			NativeAnimatedHelper_default.API.unsetWaitingForIdentifier(startNativeAnimationWaitId);
		}
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/animations/DecayAnimation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var DecayAnimation = class extends Animation {
	constructor(config) {
		var _config$deceleration, _config$isInteraction, _config$iterations;
		super();
		this._deceleration = (_config$deceleration = config.deceleration) !== null && _config$deceleration !== void 0 ? _config$deceleration : .998;
		this._velocity = config.velocity;
		this._useNativeDriver = shouldUseNativeDriver(config);
		this.__isInteraction = (_config$isInteraction = config.isInteraction) !== null && _config$isInteraction !== void 0 ? _config$isInteraction : !this._useNativeDriver;
		this.__iterations = (_config$iterations = config.iterations) !== null && _config$iterations !== void 0 ? _config$iterations : 1;
	}
	__getNativeAnimationConfig() {
		return {
			type: "decay",
			deceleration: this._deceleration,
			velocity: this._velocity,
			iterations: this.__iterations
		};
	}
	start(fromValue, onUpdate, onEnd, previousAnimation, animatedValue) {
		this.__active = true;
		this._lastValue = fromValue;
		this._fromValue = fromValue;
		this._onUpdate = onUpdate;
		this.__onEnd = onEnd;
		this._startTime = Date.now();
		if (this._useNativeDriver) this.__startNativeAnimation(animatedValue);
		else this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
	}
	onUpdate() {
		var now = Date.now();
		var value = this._fromValue + this._velocity / (1 - this._deceleration) * (1 - Math.exp(-(1 - this._deceleration) * (now - this._startTime)));
		this._onUpdate(value);
		if (Math.abs(this._lastValue - value) < .1) {
			this.__debouncedOnEnd({ finished: true });
			return;
		}
		this._lastValue = value;
		if (this.__active) this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
	}
	stop() {
		super.stop();
		this.__active = false;
		global.cancelAnimationFrame(this._animationFrame);
		this.__debouncedOnEnd({ finished: false });
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/SpringConfig.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
function stiffnessFromOrigamiValue(oValue) {
	return (oValue - 30) * 3.62 + 194;
}
function dampingFromOrigamiValue(oValue) {
	return (oValue - 8) * 3 + 25;
}
function fromOrigamiTensionAndFriction(tension, friction) {
	return {
		stiffness: stiffnessFromOrigamiValue(tension),
		damping: dampingFromOrigamiValue(friction)
	};
}
function fromBouncinessAndSpeed(bounciness, speed) {
	function normalize(value, startValue, endValue) {
		return (value - startValue) / (endValue - startValue);
	}
	function projectNormal(n, start, end) {
		return start + n * (end - start);
	}
	function linearInterpolation(t, start, end) {
		return t * end + (1 - t) * start;
	}
	function quadraticOutInterpolation(t, start, end) {
		return linearInterpolation(2 * t - t * t, start, end);
	}
	function b3Friction1(x) {
		return 7e-4 * Math.pow(x, 3) - .031 * Math.pow(x, 2) + .64 * x + 1.28;
	}
	function b3Friction2(x) {
		return 44e-6 * Math.pow(x, 3) - .006 * Math.pow(x, 2) + .36 * x + 2;
	}
	function b3Friction3(x) {
		return 45e-8 * Math.pow(x, 3) - 332e-6 * Math.pow(x, 2) + .1078 * x + 5.84;
	}
	function b3Nobounce(tension) {
		if (tension <= 18) return b3Friction1(tension);
		else if (tension > 18 && tension <= 44) return b3Friction2(tension);
		else return b3Friction3(tension);
	}
	var b = normalize(bounciness / 1.7, 0, 20);
	b = projectNormal(b, 0, .8);
	var bouncyTension = projectNormal(normalize(speed / 1.7, 0, 20), .5, 200);
	var bouncyFriction = quadraticOutInterpolation(b, b3Nobounce(bouncyTension), .01);
	return {
		stiffness: stiffnessFromOrigamiValue(bouncyTension),
		damping: dampingFromOrigamiValue(bouncyFriction)
	};
}
var SpringConfig_default = {
	fromOrigamiTensionAndFriction,
	fromBouncinessAndSpeed
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/nodes/AnimatedColor.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var NativeAnimatedAPI = NativeAnimatedHelper_default.API;
var defaultColor = {
	r: 0,
	g: 0,
	b: 0,
	a: 1
};
var _uniqueId = 1;
var processColorObject = (color) => {
	return color;
};
function processColor$1(color) {
	if (color === void 0 || color === null) return null;
	if (isRgbaValue(color)) return color;
	var normalizedColor = (0, import_normalize_colors.default)(color);
	if (normalizedColor === void 0 || normalizedColor === null) return null;
	if (typeof normalizedColor === "object") {
		var processedColorObj = processColorObject(normalizedColor);
		if (processedColorObj != null) return processedColorObj;
	} else if (typeof normalizedColor === "number") return {
		r: (normalizedColor & 4278190080) >>> 24,
		g: (normalizedColor & 16711680) >>> 16,
		b: (normalizedColor & 65280) >>> 8,
		a: (normalizedColor & 255) / 255
	};
	return null;
}
function isRgbaValue(value) {
	return value && typeof value.r === "number" && typeof value.g === "number" && typeof value.b === "number" && typeof value.a === "number";
}
function isRgbaAnimatedValue(value) {
	return value && value.r instanceof AnimatedValue && value.g instanceof AnimatedValue && value.b instanceof AnimatedValue && value.a instanceof AnimatedValue;
}
var AnimatedColor = class extends AnimatedWithChildren {
	constructor(valueIn, config) {
		super();
		this._listeners = {};
		var value = valueIn !== null && valueIn !== void 0 ? valueIn : defaultColor;
		if (isRgbaAnimatedValue(value)) {
			var rgbaAnimatedValue = value;
			this.r = rgbaAnimatedValue.r;
			this.g = rgbaAnimatedValue.g;
			this.b = rgbaAnimatedValue.b;
			this.a = rgbaAnimatedValue.a;
		} else {
			var _processColor;
			var processedColor = (_processColor = processColor$1(value)) !== null && _processColor !== void 0 ? _processColor : defaultColor;
			var initColor = defaultColor;
			if (isRgbaValue(processedColor)) initColor = processedColor;
			else this.nativeColor = processedColor;
			this.r = new AnimatedValue(initColor.r);
			this.g = new AnimatedValue(initColor.g);
			this.b = new AnimatedValue(initColor.b);
			this.a = new AnimatedValue(initColor.a);
		}
		if (this.nativeColor || config && config.useNativeDriver) this.__makeNative();
	}
	/**
	* Directly set the value. This will stop any animations running on the value
	* and update all the bound properties.
	*/
	setValue(value) {
		var _processColor2;
		var shouldUpdateNodeConfig = false;
		if (this.__isNative) {
			var nativeTag = this.__getNativeTag();
			NativeAnimatedAPI.setWaitingForIdentifier(nativeTag.toString());
		}
		var processedColor = (_processColor2 = processColor$1(value)) !== null && _processColor2 !== void 0 ? _processColor2 : defaultColor;
		if (isRgbaValue(processedColor)) {
			var rgbaValue = processedColor;
			this.r.setValue(rgbaValue.r);
			this.g.setValue(rgbaValue.g);
			this.b.setValue(rgbaValue.b);
			this.a.setValue(rgbaValue.a);
			if (this.nativeColor != null) {
				this.nativeColor = null;
				shouldUpdateNodeConfig = true;
			}
		} else {
			var nativeColor = processedColor;
			if (this.nativeColor !== nativeColor) {
				this.nativeColor = nativeColor;
				shouldUpdateNodeConfig = true;
			}
		}
		if (this.__isNative) {
			var _nativeTag = this.__getNativeTag();
			if (shouldUpdateNodeConfig) NativeAnimatedAPI.updateAnimatedNodeConfig(_nativeTag, this.__getNativeConfig());
			NativeAnimatedAPI.unsetWaitingForIdentifier(_nativeTag.toString());
		}
	}
	/**
	* Sets an offset that is applied on top of whatever value is set, whether
	* via `setValue`, an animation, or `Animated.event`. Useful for compensating
	* things like the start of a pan gesture.
	*/
	setOffset(offset) {
		this.r.setOffset(offset.r);
		this.g.setOffset(offset.g);
		this.b.setOffset(offset.b);
		this.a.setOffset(offset.a);
	}
	/**
	* Merges the offset value into the base value and resets the offset to zero.
	* The final output of the value is unchanged.
	*/
	flattenOffset() {
		this.r.flattenOffset();
		this.g.flattenOffset();
		this.b.flattenOffset();
		this.a.flattenOffset();
	}
	/**
	* Sets the offset value to the base value, and resets the base value to
	* zero. The final output of the value is unchanged.
	*/
	extractOffset() {
		this.r.extractOffset();
		this.g.extractOffset();
		this.b.extractOffset();
		this.a.extractOffset();
	}
	/**
	* Adds an asynchronous listener to the value so you can observe updates from
	* animations.  This is useful because there is no way to synchronously read
	* the value because it might be driven natively.
	*
	* Returns a string that serves as an identifier for the listener.
	*/
	addListener(callback) {
		var id = String(_uniqueId++);
		var jointCallback = (_ref) => {
			_ref.value;
			callback(this.__getValue());
		};
		this._listeners[id] = {
			r: this.r.addListener(jointCallback),
			g: this.g.addListener(jointCallback),
			b: this.b.addListener(jointCallback),
			a: this.a.addListener(jointCallback)
		};
		return id;
	}
	/**
	* Unregister a listener. The `id` param shall match the identifier
	* previously returned by `addListener()`.
	*/
	removeListener(id) {
		this.r.removeListener(this._listeners[id].r);
		this.g.removeListener(this._listeners[id].g);
		this.b.removeListener(this._listeners[id].b);
		this.a.removeListener(this._listeners[id].a);
		delete this._listeners[id];
	}
	/**
	* Remove all registered listeners.
	*/
	removeAllListeners() {
		this.r.removeAllListeners();
		this.g.removeAllListeners();
		this.b.removeAllListeners();
		this.a.removeAllListeners();
		this._listeners = {};
	}
	/**
	* Stops any running animation or tracking. `callback` is invoked with the
	* final value after stopping the animation, which is useful for updating
	* state to match the animation position with layout.
	*/
	stopAnimation(callback) {
		this.r.stopAnimation();
		this.g.stopAnimation();
		this.b.stopAnimation();
		this.a.stopAnimation();
		callback && callback(this.__getValue());
	}
	/**
	* Stops any animation and resets the value to its original.
	*/
	resetAnimation(callback) {
		this.r.resetAnimation();
		this.g.resetAnimation();
		this.b.resetAnimation();
		this.a.resetAnimation();
		callback && callback(this.__getValue());
	}
	__getValue() {
		if (this.nativeColor != null) return this.nativeColor;
		else return "rgba(" + this.r.__getValue() + ", " + this.g.__getValue() + ", " + this.b.__getValue() + ", " + this.a.__getValue() + ")";
	}
	__attach() {
		this.r.__addChild(this);
		this.g.__addChild(this);
		this.b.__addChild(this);
		this.a.__addChild(this);
		super.__attach();
	}
	__detach() {
		this.r.__removeChild(this);
		this.g.__removeChild(this);
		this.b.__removeChild(this);
		this.a.__removeChild(this);
		super.__detach();
	}
	__makeNative(platformConfig) {
		this.r.__makeNative(platformConfig);
		this.g.__makeNative(platformConfig);
		this.b.__makeNative(platformConfig);
		this.a.__makeNative(platformConfig);
		super.__makeNative(platformConfig);
	}
	__getNativeConfig() {
		return {
			type: "color",
			r: this.r.__getNativeTag(),
			g: this.g.__getNativeTag(),
			b: this.b.__getNativeTag(),
			a: this.a.__getNativeTag(),
			nativeColor: this.nativeColor
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/animations/SpringAnimation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var SpringAnimation = class SpringAnimation extends Animation {
	constructor(config) {
		var _config$overshootClam, _config$restDisplacem, _config$restSpeedThre, _config$velocity, _config$velocity2, _config$delay, _config$isInteraction, _config$iterations;
		super();
		this._overshootClamping = (_config$overshootClam = config.overshootClamping) !== null && _config$overshootClam !== void 0 ? _config$overshootClam : false;
		this._restDisplacementThreshold = (_config$restDisplacem = config.restDisplacementThreshold) !== null && _config$restDisplacem !== void 0 ? _config$restDisplacem : .001;
		this._restSpeedThreshold = (_config$restSpeedThre = config.restSpeedThreshold) !== null && _config$restSpeedThre !== void 0 ? _config$restSpeedThre : .001;
		this._initialVelocity = (_config$velocity = config.velocity) !== null && _config$velocity !== void 0 ? _config$velocity : 0;
		this._lastVelocity = (_config$velocity2 = config.velocity) !== null && _config$velocity2 !== void 0 ? _config$velocity2 : 0;
		this._toValue = config.toValue;
		this._delay = (_config$delay = config.delay) !== null && _config$delay !== void 0 ? _config$delay : 0;
		this._useNativeDriver = shouldUseNativeDriver(config);
		this._platformConfig = config.platformConfig;
		this.__isInteraction = (_config$isInteraction = config.isInteraction) !== null && _config$isInteraction !== void 0 ? _config$isInteraction : !this._useNativeDriver;
		this.__iterations = (_config$iterations = config.iterations) !== null && _config$iterations !== void 0 ? _config$iterations : 1;
		if (config.stiffness !== void 0 || config.damping !== void 0 || config.mass !== void 0) {
			var _config$stiffness, _config$damping, _config$mass;
			(0, import_invariant.default)(config.bounciness === void 0 && config.speed === void 0 && config.tension === void 0 && config.friction === void 0, "You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one");
			this._stiffness = (_config$stiffness = config.stiffness) !== null && _config$stiffness !== void 0 ? _config$stiffness : 100;
			this._damping = (_config$damping = config.damping) !== null && _config$damping !== void 0 ? _config$damping : 10;
			this._mass = (_config$mass = config.mass) !== null && _config$mass !== void 0 ? _config$mass : 1;
		} else if (config.bounciness !== void 0 || config.speed !== void 0) {
			var _config$bounciness, _config$speed;
			(0, import_invariant.default)(config.tension === void 0 && config.friction === void 0 && config.stiffness === void 0 && config.damping === void 0 && config.mass === void 0, "You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one");
			var springConfig = SpringConfig_default.fromBouncinessAndSpeed((_config$bounciness = config.bounciness) !== null && _config$bounciness !== void 0 ? _config$bounciness : 8, (_config$speed = config.speed) !== null && _config$speed !== void 0 ? _config$speed : 12);
			this._stiffness = springConfig.stiffness;
			this._damping = springConfig.damping;
			this._mass = 1;
		} else {
			var _config$tension, _config$friction;
			var _springConfig = SpringConfig_default.fromOrigamiTensionAndFriction((_config$tension = config.tension) !== null && _config$tension !== void 0 ? _config$tension : 40, (_config$friction = config.friction) !== null && _config$friction !== void 0 ? _config$friction : 7);
			this._stiffness = _springConfig.stiffness;
			this._damping = _springConfig.damping;
			this._mass = 1;
		}
		(0, import_invariant.default)(this._stiffness > 0, "Stiffness value must be greater than 0");
		(0, import_invariant.default)(this._damping > 0, "Damping value must be greater than 0");
		(0, import_invariant.default)(this._mass > 0, "Mass value must be greater than 0");
	}
	__getNativeAnimationConfig() {
		var _this$_initialVelocit;
		return {
			type: "spring",
			overshootClamping: this._overshootClamping,
			restDisplacementThreshold: this._restDisplacementThreshold,
			restSpeedThreshold: this._restSpeedThreshold,
			stiffness: this._stiffness,
			damping: this._damping,
			mass: this._mass,
			initialVelocity: (_this$_initialVelocit = this._initialVelocity) !== null && _this$_initialVelocit !== void 0 ? _this$_initialVelocit : this._lastVelocity,
			toValue: this._toValue,
			iterations: this.__iterations,
			platformConfig: this._platformConfig
		};
	}
	start(fromValue, onUpdate, onEnd, previousAnimation, animatedValue) {
		this.__active = true;
		this._startPosition = fromValue;
		this._lastPosition = this._startPosition;
		this._onUpdate = onUpdate;
		this.__onEnd = onEnd;
		this._lastTime = Date.now();
		this._frameTime = 0;
		if (previousAnimation instanceof SpringAnimation) {
			var internalState = previousAnimation.getInternalState();
			this._lastPosition = internalState.lastPosition;
			this._lastVelocity = internalState.lastVelocity;
			this._initialVelocity = this._lastVelocity;
			this._lastTime = internalState.lastTime;
		}
		var start = () => {
			if (this._useNativeDriver) this.__startNativeAnimation(animatedValue);
			else this.onUpdate();
		};
		if (this._delay) this._timeout = setTimeout(start, this._delay);
		else start();
	}
	getInternalState() {
		return {
			lastPosition: this._lastPosition,
			lastVelocity: this._lastVelocity,
			lastTime: this._lastTime
		};
	}
	/**
	* This spring model is based off of a damped harmonic oscillator
	* (https://en.wikipedia.org/wiki/Harmonic_oscillator#Damped_harmonic_oscillator).
	*
	* We use the closed form of the second order differential equation:
	*
	* x'' + (2ζ⍵_0)x' + ⍵^2x = 0
	*
	* where
	*    ⍵_0 = √(k / m) (undamped angular frequency of the oscillator),
	*    ζ = c / 2√mk (damping ratio),
	*    c = damping constant
	*    k = stiffness
	*    m = mass
	*
	* The derivation of the closed form is described in detail here:
	* http://planetmath.org/sites/default/files/texpdf/39745.pdf
	*
	* This algorithm happens to match the algorithm used by CASpringAnimation,
	* a QuartzCore (iOS) API that creates spring animations.
	*/
	onUpdate() {
		var MAX_STEPS = 64;
		var now = Date.now();
		if (now > this._lastTime + MAX_STEPS) now = this._lastTime + MAX_STEPS;
		var deltaTime = (now - this._lastTime) / 1e3;
		this._frameTime += deltaTime;
		var c = this._damping;
		var m = this._mass;
		var k = this._stiffness;
		var v0 = -this._initialVelocity;
		var zeta = c / (2 * Math.sqrt(k * m));
		var omega0 = Math.sqrt(k / m);
		var omega1 = omega0 * Math.sqrt(1 - zeta * zeta);
		var x0 = this._toValue - this._startPosition;
		var position = 0;
		var velocity = 0;
		var t = this._frameTime;
		if (zeta < 1) {
			var envelope = Math.exp(-zeta * omega0 * t);
			position = this._toValue - envelope * ((v0 + zeta * omega0 * x0) / omega1 * Math.sin(omega1 * t) + x0 * Math.cos(omega1 * t));
			velocity = zeta * omega0 * envelope * (Math.sin(omega1 * t) * (v0 + zeta * omega0 * x0) / omega1 + x0 * Math.cos(omega1 * t)) - envelope * (Math.cos(omega1 * t) * (v0 + zeta * omega0 * x0) - omega1 * x0 * Math.sin(omega1 * t));
		} else {
			var _envelope = Math.exp(-omega0 * t);
			position = this._toValue - _envelope * (x0 + (v0 + omega0 * x0) * t);
			velocity = _envelope * (v0 * (t * omega0 - 1) + t * x0 * (omega0 * omega0));
		}
		this._lastTime = now;
		this._lastPosition = position;
		this._lastVelocity = velocity;
		this._onUpdate(position);
		if (!this.__active) return;
		var isOvershooting = false;
		if (this._overshootClamping && this._stiffness !== 0) {
			if (this._startPosition < this._toValue) isOvershooting = position > this._toValue;
			else isOvershooting = position < this._toValue;
		}
		var isVelocity = Math.abs(velocity) <= this._restSpeedThreshold;
		var isDisplacement = true;
		if (this._stiffness !== 0) isDisplacement = Math.abs(this._toValue - position) <= this._restDisplacementThreshold;
		if (isOvershooting || isVelocity && isDisplacement) {
			if (this._stiffness !== 0) {
				this._lastPosition = this._toValue;
				this._lastVelocity = 0;
				this._onUpdate(this._toValue);
			}
			this.__debouncedOnEnd({ finished: true });
			return;
		}
		this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
	}
	stop() {
		super.stop();
		this.__active = false;
		clearTimeout(this._timeout);
		global.cancelAnimationFrame(this._animationFrame);
		this.__debouncedOnEnd({ finished: false });
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/bezier.js
/**
* Portions Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* BezierEasing - use bezier curve for transition easing function
* https://github.com/gre/bezier-easing
* @copyright 2014-2015 Gaëtan Renaudeau. MIT License.
*/
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = .001;
var SUBDIVISION_PRECISION = 1e-7;
var SUBDIVISION_MAX_ITERATIONS = 10;
var kSplineTableSize = 11;
var kSampleStepSize = 1 / (kSplineTableSize - 1);
var float32ArraySupported = typeof Float32Array === "function";
function A(aA1, aA2) {
	return 1 - 3 * aA2 + 3 * aA1;
}
function B(aA1, aA2) {
	return 3 * aA2 - 6 * aA1;
}
function C(aA1) {
	return 3 * aA1;
}
function calcBezier(aT, aA1, aA2) {
	return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}
function getSlope(aT, aA1, aA2) {
	return 3 * A(aA1, aA2) * aT * aT + 2 * B(aA1, aA2) * aT + C(aA1);
}
function binarySubdivide(aX, _aA, _aB, mX1, mX2) {
	var currentX, currentT, i = 0, aA = _aA, aB = _aB;
	do {
		currentT = aA + (aB - aA) / 2;
		currentX = calcBezier(currentT, mX1, mX2) - aX;
		if (currentX > 0) aB = currentT;
		else aA = currentT;
	} while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
	return currentT;
}
function newtonRaphsonIterate(aX, _aGuessT, mX1, mX2) {
	var aGuessT = _aGuessT;
	for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
		var currentSlope = getSlope(aGuessT, mX1, mX2);
		if (currentSlope === 0) return aGuessT;
		var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
		aGuessT -= currentX / currentSlope;
	}
	return aGuessT;
}
function bezier(mX1, mY1, mX2, mY2) {
	if (!(mX1 >= 0 && mX1 <= 1 && mX2 >= 0 && mX2 <= 1)) throw new Error("bezier x values must be in [0, 1] range");
	var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
	if (mX1 !== mY1 || mX2 !== mY2) for (var i = 0; i < kSplineTableSize; ++i) sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
	function getTForX(aX) {
		var intervalStart = 0;
		var currentSample = 1;
		var lastSample = kSplineTableSize - 1;
		for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) intervalStart += kSampleStepSize;
		--currentSample;
		var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
		var guessForT = intervalStart + dist * kSampleStepSize;
		var initialSlope = getSlope(guessForT, mX1, mX2);
		if (initialSlope >= NEWTON_MIN_SLOPE) return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
		else if (initialSlope === 0) return guessForT;
		else return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
	}
	return function BezierEasing(x) {
		if (mX1 === mY1 && mX2 === mY2) return x;
		if (x === 0) return 0;
		if (x === 1) return 1;
		return calcBezier(getTForX(x), mY1, mY2);
	};
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/Easing.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
var ease;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Easing/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Easing_default = class Easing {
	/**
	* A stepping function, returns 1 for any positive value of `n`.
	*/
	static step0(n) {
		return n > 0 ? 1 : 0;
	}
	/**
	* A stepping function, returns 1 if `n` is greater than or equal to 1.
	*/
	static step1(n) {
		return n >= 1 ? 1 : 0;
	}
	/**
	* A linear function, `f(t) = t`. Position correlates to elapsed time one to
	* one.
	*
	* http://cubic-bezier.com/#0,0,1,1
	*/
	static linear(t) {
		return t;
	}
	/**
	* A simple inertial interaction, similar to an object slowly accelerating to
	* speed.
	*
	* http://cubic-bezier.com/#.42,0,1,1
	*/
	static ease(t) {
		if (!ease) ease = Easing.bezier(.42, 0, 1, 1);
		return ease(t);
	}
	/**
	* A quadratic function, `f(t) = t * t`. Position equals the square of elapsed
	* time.
	*
	* http://easings.net/#easeInQuad
	*/
	static quad(t) {
		return t * t;
	}
	/**
	* A cubic function, `f(t) = t * t * t`. Position equals the cube of elapsed
	* time.
	*
	* http://easings.net/#easeInCubic
	*/
	static cubic(t) {
		return t * t * t;
	}
	/**
	* A power function. Position is equal to the Nth power of elapsed time.
	*
	* n = 4: http://easings.net/#easeInQuart
	* n = 5: http://easings.net/#easeInQuint
	*/
	static poly(n) {
		return (t) => Math.pow(t, n);
	}
	/**
	* A sinusoidal function.
	*
	* http://easings.net/#easeInSine
	*/
	static sin(t) {
		return 1 - Math.cos(t * Math.PI / 2);
	}
	/**
	* A circular function.
	*
	* http://easings.net/#easeInCirc
	*/
	static circle(t) {
		return 1 - Math.sqrt(1 - t * t);
	}
	/**
	* An exponential function.
	*
	* http://easings.net/#easeInExpo
	*/
	static exp(t) {
		return Math.pow(2, 10 * (t - 1));
	}
	/**
	* A simple elastic interaction, similar to a spring oscillating back and
	* forth.
	*
	* Default bounciness is 1, which overshoots a little bit once. 0 bounciness
	* doesn't overshoot at all, and bounciness of N > 1 will overshoot about N
	* times.
	*
	* http://easings.net/#easeInElastic
	*/
	static elastic(bounciness) {
		if (bounciness === void 0) bounciness = 1;
		var p = bounciness * Math.PI;
		return (t) => 1 - Math.pow(Math.cos(t * Math.PI / 2), 3) * Math.cos(t * p);
	}
	/**
	* Use with `Animated.parallel()` to create a simple effect where the object
	* animates back slightly as the animation starts.
	*
	* Wolfram Plot:
	*
	* - http://tiny.cc/back_default (s = 1.70158, default)
	*/
	static back(s) {
		if (s === void 0) s = 1.70158;
		return (t) => t * t * ((s + 1) * t - s);
	}
	/**
	* Provides a simple bouncing effect.
	*
	* http://easings.net/#easeInBounce
	*/
	static bounce(t) {
		if (t < 1 / 2.75) return 7.5625 * t * t;
		if (t < 2 / 2.75) {
			var _t = t - 1.5 / 2.75;
			return 7.5625 * _t * _t + .75;
		}
		if (t < 2.5 / 2.75) {
			var _t2 = t - 2.25 / 2.75;
			return 7.5625 * _t2 * _t2 + .9375;
		}
		var t2 = t - 2.625 / 2.75;
		return 7.5625 * t2 * t2 + .984375;
	}
	/**
	* Provides a cubic bezier curve, equivalent to CSS Transitions'
	* `transition-timing-function`.
	*
	* A useful tool to visualize cubic bezier curves can be found at
	* http://cubic-bezier.com/
	*/
	static bezier(x1, y1, x2, y2) {
		return bezier(x1, y1, x2, y2);
	}
	/**
	* Runs an easing function forwards.
	*/
	static in(easing) {
		return easing;
	}
	/**
	* Runs an easing function backwards.
	*/
	static out(easing) {
		return (t) => 1 - easing(1 - t);
	}
	/**
	* Makes any easing function symmetrical. The easing function will run
	* forwards for half of the duration, then backwards for the rest of the
	* duration.
	*/
	static inOut(easing) {
		return (t) => {
			if (t < .5) return easing(t * 2) / 2;
			return 1 - easing((1 - t) * 2) / 2;
		};
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/animations/TimingAnimation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _easeInOut;
function easeInOut() {
	if (!_easeInOut) _easeInOut = Easing_default.inOut(Easing_default.ease);
	return _easeInOut;
}
var TimingAnimation = class extends Animation {
	constructor(config) {
		var _config$easing, _config$duration, _config$delay, _config$iterations, _config$isInteraction;
		super();
		this._toValue = config.toValue;
		this._easing = (_config$easing = config.easing) !== null && _config$easing !== void 0 ? _config$easing : easeInOut();
		this._duration = (_config$duration = config.duration) !== null && _config$duration !== void 0 ? _config$duration : 500;
		this._delay = (_config$delay = config.delay) !== null && _config$delay !== void 0 ? _config$delay : 0;
		this.__iterations = (_config$iterations = config.iterations) !== null && _config$iterations !== void 0 ? _config$iterations : 1;
		this._useNativeDriver = shouldUseNativeDriver(config);
		this._platformConfig = config.platformConfig;
		this.__isInteraction = (_config$isInteraction = config.isInteraction) !== null && _config$isInteraction !== void 0 ? _config$isInteraction : !this._useNativeDriver;
	}
	__getNativeAnimationConfig() {
		var frameDuration = 1e3 / 60;
		var frames = [];
		var numFrames = Math.round(this._duration / frameDuration);
		for (var frame = 0; frame < numFrames; frame++) frames.push(this._easing(frame / numFrames));
		frames.push(this._easing(1));
		return {
			type: "frames",
			frames,
			toValue: this._toValue,
			iterations: this.__iterations,
			platformConfig: this._platformConfig
		};
	}
	start(fromValue, onUpdate, onEnd, previousAnimation, animatedValue) {
		this.__active = true;
		this._fromValue = fromValue;
		this._onUpdate = onUpdate;
		this.__onEnd = onEnd;
		var start = () => {
			if (this._duration === 0 && !this._useNativeDriver) {
				this._onUpdate(this._toValue);
				this.__debouncedOnEnd({ finished: true });
			} else {
				this._startTime = Date.now();
				if (this._useNativeDriver) this.__startNativeAnimation(animatedValue);
				else this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
			}
		};
		if (this._delay) this._timeout = setTimeout(start, this._delay);
		else start();
	}
	onUpdate() {
		var now = Date.now();
		if (now >= this._startTime + this._duration) {
			if (this._duration === 0) this._onUpdate(this._toValue);
			else this._onUpdate(this._fromValue + this._easing(1) * (this._toValue - this._fromValue));
			this.__debouncedOnEnd({ finished: true });
			return;
		}
		this._onUpdate(this._fromValue + this._easing((now - this._startTime) / this._duration) * (this._toValue - this._fromValue));
		if (this.__active) this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
	}
	stop() {
		super.stop();
		this.__active = false;
		clearTimeout(this._timeout);
		global.cancelAnimationFrame(this._animationFrame);
		this.__debouncedOnEnd({ finished: false });
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var add = function add(a, b) {
	return new AnimatedAddition(a, b);
};
var subtract = function subtract(a, b) {
	return new AnimatedSubtraction(a, b);
};
var divide = function divide(a, b) {
	return new AnimatedDivision(a, b);
};
var multiply = function multiply(a, b) {
	return new AnimatedMultiplication(a, b);
};
var modulo = function modulo(a, modulus) {
	return new AnimatedModulo(a, modulus);
};
var diffClamp = function diffClamp(a, min, max) {
	return new AnimatedDiffClamp(a, min, max);
};
var _combineCallbacks = function _combineCallbacks(callback, config) {
	if (callback && config.onComplete) return function() {
		config.onComplete && config.onComplete(...arguments);
		callback && callback(...arguments);
	};
	else return callback || config.onComplete;
};
var maybeVectorAnim = function maybeVectorAnim(value, config, anim) {
	if (value instanceof AnimatedValueXY) {
		var configX = _objectSpread2({}, config);
		var configY = _objectSpread2({}, config);
		for (var key in config) {
			var _config$key = config[key], x = _config$key.x, y = _config$key.y;
			if (x !== void 0 && y !== void 0) {
				configX[key] = x;
				configY[key] = y;
			}
		}
		return parallel$1([anim(value.x, configX), anim(value.y, configY)], { stopTogether: false });
	} else if (value instanceof AnimatedColor) {
		var configR = _objectSpread2({}, config);
		var configG = _objectSpread2({}, config);
		var configB = _objectSpread2({}, config);
		var configA = _objectSpread2({}, config);
		for (var _key in config) {
			var _config$_key = config[_key], r = _config$_key.r, g = _config$_key.g, b = _config$_key.b, a = _config$_key.a;
			if (r !== void 0 && g !== void 0 && b !== void 0 && a !== void 0) {
				configR[_key] = r;
				configG[_key] = g;
				configB[_key] = b;
				configA[_key] = a;
			}
		}
		return parallel$1([
			anim(value.r, configR),
			anim(value.g, configG),
			anim(value.b, configB),
			anim(value.a, configA)
		], { stopTogether: false });
	}
	return null;
};
var spring$1 = function spring(value, config) {
	var _start = function start(animatedValue, configuration, callback) {
		callback = _combineCallbacks(callback, configuration);
		var singleValue = animatedValue;
		var singleConfig = configuration;
		singleValue.stopTracking();
		if (configuration.toValue instanceof AnimatedNode) singleValue.track(new AnimatedTracking(singleValue, configuration.toValue, SpringAnimation, singleConfig, callback));
		else singleValue.animate(new SpringAnimation(singleConfig), callback);
	};
	return maybeVectorAnim(value, config, spring) || {
		start: function start(callback) {
			_start(value, config, callback);
		},
		stop: function stop() {
			value.stopAnimation();
		},
		reset: function reset() {
			value.resetAnimation();
		},
		_startNativeLoop: function _startNativeLoop(iterations) {
			_start(value, _objectSpread2(_objectSpread2({}, config), {}, { iterations }));
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return config.useNativeDriver || false;
		}
	};
};
var timing$1 = function timing(value, config) {
	var _start2 = function start(animatedValue, configuration, callback) {
		callback = _combineCallbacks(callback, configuration);
		var singleValue = animatedValue;
		var singleConfig = configuration;
		singleValue.stopTracking();
		if (configuration.toValue instanceof AnimatedNode) singleValue.track(new AnimatedTracking(singleValue, configuration.toValue, TimingAnimation, singleConfig, callback));
		else singleValue.animate(new TimingAnimation(singleConfig), callback);
	};
	return maybeVectorAnim(value, config, timing) || {
		start: function start(callback) {
			_start2(value, config, callback);
		},
		stop: function stop() {
			value.stopAnimation();
		},
		reset: function reset() {
			value.resetAnimation();
		},
		_startNativeLoop: function _startNativeLoop(iterations) {
			_start2(value, _objectSpread2(_objectSpread2({}, config), {}, { iterations }));
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return config.useNativeDriver || false;
		}
	};
};
var decay$1 = function decay(value, config) {
	var _start3 = function start(animatedValue, configuration, callback) {
		callback = _combineCallbacks(callback, configuration);
		var singleValue = animatedValue;
		var singleConfig = configuration;
		singleValue.stopTracking();
		singleValue.animate(new DecayAnimation(singleConfig), callback);
	};
	return maybeVectorAnim(value, config, decay) || {
		start: function start(callback) {
			_start3(value, config, callback);
		},
		stop: function stop() {
			value.stopAnimation();
		},
		reset: function reset() {
			value.resetAnimation();
		},
		_startNativeLoop: function _startNativeLoop(iterations) {
			_start3(value, _objectSpread2(_objectSpread2({}, config), {}, { iterations }));
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return config.useNativeDriver || false;
		}
	};
};
var sequence$1 = function sequence(animations) {
	var current = 0;
	return {
		start: function start(callback) {
			var onComplete = function onComplete(result) {
				if (!result.finished) {
					callback && callback(result);
					return;
				}
				current++;
				if (current === animations.length) {
					current = 0;
					callback && callback(result);
					return;
				}
				animations[current].start(onComplete);
			};
			if (animations.length === 0) callback && callback({ finished: true });
			else animations[current].start(onComplete);
		},
		stop: function stop() {
			if (current < animations.length) animations[current].stop();
		},
		reset: function reset() {
			animations.forEach((animation, idx) => {
				if (idx <= current) animation.reset();
			});
			current = 0;
		},
		_startNativeLoop: function _startNativeLoop() {
			throw new Error("Loops run using the native driver cannot contain Animated.sequence animations");
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return false;
		}
	};
};
var parallel$1 = function parallel(animations, config) {
	var doneCount = 0;
	var hasEnded = {};
	var stopTogether = !(config && config.stopTogether === false);
	var result = {
		start: function start(callback) {
			if (doneCount === animations.length) {
				callback && callback({ finished: true });
				return;
			}
			animations.forEach((animation, idx) => {
				var cb = function cb(endResult) {
					hasEnded[idx] = true;
					doneCount++;
					if (doneCount === animations.length) {
						doneCount = 0;
						callback && callback(endResult);
						return;
					}
					if (!endResult.finished && stopTogether) result.stop();
				};
				if (!animation) cb({ finished: true });
				else animation.start(cb);
			});
		},
		stop: function stop() {
			animations.forEach((animation, idx) => {
				!hasEnded[idx] && animation.stop();
				hasEnded[idx] = true;
			});
		},
		reset: function reset() {
			animations.forEach((animation, idx) => {
				animation.reset();
				hasEnded[idx] = false;
				doneCount = 0;
			});
		},
		_startNativeLoop: function _startNativeLoop() {
			throw new Error("Loops run using the native driver cannot contain Animated.parallel animations");
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return false;
		}
	};
	return result;
};
var delay$1 = function delay(time) {
	return timing$1(new AnimatedValue(0), {
		toValue: 0,
		delay: time,
		duration: 0,
		useNativeDriver: false
	});
};
var stagger$1 = function stagger(time, animations) {
	return parallel$1(animations.map((animation, i) => {
		return sequence$1([delay$1(time * i), animation]);
	}));
};
var loop$1 = function loop(animation, _temp) {
	var _ref = _temp === void 0 ? {} : _temp, _ref$iterations = _ref.iterations, iterations = _ref$iterations === void 0 ? -1 : _ref$iterations, _ref$resetBeforeItera = _ref.resetBeforeIteration, resetBeforeIteration = _ref$resetBeforeItera === void 0 ? true : _ref$resetBeforeItera;
	var isFinished = false;
	var iterationsSoFar = 0;
	return {
		start: function start(callback) {
			var restart = function restart(result) {
				if (result === void 0) result = { finished: true };
				if (isFinished || iterationsSoFar === iterations || result.finished === false) callback && callback(result);
				else {
					iterationsSoFar++;
					resetBeforeIteration && animation.reset();
					animation.start(restart);
				}
			};
			if (!animation || iterations === 0) callback && callback({ finished: true });
			else if (animation._isUsingNativeDriver()) animation._startNativeLoop(iterations);
			else restart();
		},
		stop: function stop() {
			isFinished = true;
			animation.stop();
		},
		reset: function reset() {
			iterationsSoFar = 0;
			isFinished = false;
			animation.reset();
		},
		_startNativeLoop: function _startNativeLoop() {
			throw new Error("Loops run using the native driver cannot contain Animated.loop animations");
		},
		_isUsingNativeDriver: function _isUsingNativeDriver() {
			return animation._isUsingNativeDriver();
		}
	};
};
function forkEvent(event, listener) {
	if (!event) return listener;
	else if (event instanceof AnimatedEvent) {
		event.__addListener(listener);
		return event;
	} else return function() {
		typeof event === "function" && event(...arguments);
		listener(...arguments);
	};
}
function unforkEvent(event, listener) {
	if (event && event instanceof AnimatedEvent) event.__removeListener(listener);
}
/**
* The `Animated` library is designed to make animations fluid, powerful, and
* easy to build and maintain. `Animated` focuses on declarative relationships
* between inputs and outputs, with configurable transforms in between, and
* simple `start`/`stop` methods to control time-based animation execution.
* If additional transforms are added, be sure to include them in
* AnimatedMock.js as well.
*
* See https://reactnative.dev/docs/animated
*/
var AnimatedImplementation_default = {
	/**
	* Standard value class for driving animations.  Typically initialized with
	* `new Animated.Value(0);`
	*
	* See https://reactnative.dev/docs/animated#value
	*/
	Value: AnimatedValue,
	/**
	* 2D value class for driving 2D animations, such as pan gestures.
	*
	* See https://reactnative.dev/docs/animatedvaluexy
	*/
	ValueXY: AnimatedValueXY,
	/**
	* Value class for driving color animations.
	*/
	Color: AnimatedColor,
	/**
	* Exported to use the Interpolation type in flow.
	*
	* See https://reactnative.dev/docs/animated#interpolation
	*/
	Interpolation: AnimatedInterpolation,
	/**
	* Exported for ease of type checking. All animated values derive from this
	* class.
	*
	* See https://reactnative.dev/docs/animated#node
	*/
	Node: AnimatedNode,
	/**
	* Animates a value from an initial velocity to zero based on a decay
	* coefficient.
	*
	* See https://reactnative.dev/docs/animated#decay
	*/
	decay: decay$1,
	/**
	* Animates a value along a timed easing curve. The Easing module has tons of
	* predefined curves, or you can use your own function.
	*
	* See https://reactnative.dev/docs/animated#timing
	*/
	timing: timing$1,
	/**
	* Animates a value according to an analytical spring model based on
	* damped harmonic oscillation.
	*
	* See https://reactnative.dev/docs/animated#spring
	*/
	spring: spring$1,
	/**
	* Creates a new Animated value composed from two Animated values added
	* together.
	*
	* See https://reactnative.dev/docs/animated#add
	*/
	add,
	/**
	* Creates a new Animated value composed by subtracting the second Animated
	* value from the first Animated value.
	*
	* See https://reactnative.dev/docs/animated#subtract
	*/
	subtract,
	/**
	* Creates a new Animated value composed by dividing the first Animated value
	* by the second Animated value.
	*
	* See https://reactnative.dev/docs/animated#divide
	*/
	divide,
	/**
	* Creates a new Animated value composed from two Animated values multiplied
	* together.
	*
	* See https://reactnative.dev/docs/animated#multiply
	*/
	multiply,
	/**
	* Creates a new Animated value that is the (non-negative) modulo of the
	* provided Animated value.
	*
	* See https://reactnative.dev/docs/animated#modulo
	*/
	modulo,
	/**
	* Create a new Animated value that is limited between 2 values. It uses the
	* difference between the last value so even if the value is far from the
	* bounds it will start changing when the value starts getting closer again.
	*
	* See https://reactnative.dev/docs/animated#diffclamp
	*/
	diffClamp,
	/**
	* Starts an animation after the given delay.
	*
	* See https://reactnative.dev/docs/animated#delay
	*/
	delay: delay$1,
	/**
	* Starts an array of animations in order, waiting for each to complete
	* before starting the next. If the current running animation is stopped, no
	* following animations will be started.
	*
	* See https://reactnative.dev/docs/animated#sequence
	*/
	sequence: sequence$1,
	/**
	* Starts an array of animations all at the same time. By default, if one
	* of the animations is stopped, they will all be stopped. You can override
	* this with the `stopTogether` flag.
	*
	* See https://reactnative.dev/docs/animated#parallel
	*/
	parallel: parallel$1,
	/**
	* Array of animations may run in parallel (overlap), but are started in
	* sequence with successive delays.  Nice for doing trailing effects.
	*
	* See https://reactnative.dev/docs/animated#stagger
	*/
	stagger: stagger$1,
	/**
	* Loops a given animation continuously, so that each time it reaches the
	* end, it resets and begins again from the start.
	*
	* See https://reactnative.dev/docs/animated#loop
	*/
	loop: loop$1,
	/**
	* Takes an array of mappings and extracts values from each arg accordingly,
	* then calls `setValue` on the mapped outputs.
	*
	* See https://reactnative.dev/docs/animated#event
	*/
	event: function event(argMapping, config) {
		var animatedEvent = new AnimatedEvent(argMapping, config);
		if (animatedEvent.__isNative) return animatedEvent;
		else return animatedEvent.__getHandler();
	},
	/**
	* Make any React component Animatable.  Used to create `Animated.View`, etc.
	*
	* See https://reactnative.dev/docs/animated#createanimatedcomponent
	*/
	createAnimatedComponent,
	/**
	* Imperative API to attach an animated value to an event on a view. Prefer
	* using `Animated.event` with `useNativeDrive: true` if possible.
	*
	* See https://reactnative.dev/docs/animated#attachnativeevent
	*/
	attachNativeEvent,
	/**
	* Advanced imperative API for snooping on animated events that are passed in
	* through props. Use values directly where possible.
	*
	* See https://reactnative.dev/docs/animated#forkevent
	*/
	forkEvent,
	unforkEvent,
	/**
	* Expose Event class, so it can be used as a type for type checkers.
	*/
	Event: AnimatedEvent
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/AnimatedMock.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
/**
* Animations are a source of flakiness in snapshot testing. This mock replaces
* animation functions from AnimatedImplementation with empty animations for
* predictability in tests. When possible the animation will run immediately
* to the final state.
*/
var inAnimationCallback = false;
function mockAnimationStart(start) {
	return (callback) => {
		start(callback == null ? callback : function() {
			if (inAnimationCallback) {
				console.warn("Ignoring recursive animation callback when running mock animations");
				return;
			}
			inAnimationCallback = true;
			try {
				callback(...arguments);
			} finally {
				inAnimationCallback = false;
			}
		});
	};
}
var emptyAnimation = {
	start: () => {},
	stop: () => {},
	reset: () => {},
	_startNativeLoop: () => {},
	_isUsingNativeDriver: () => {
		return false;
	}
};
var mockCompositeAnimation = (animations) => _objectSpread2(_objectSpread2({}, emptyAnimation), {}, { start: mockAnimationStart((callback) => {
	animations.forEach((animation) => animation.start());
	callback?.({ finished: true });
}) });
var AnimatedMock_default = {
	Value: AnimatedValue,
	ValueXY: AnimatedValueXY,
	Color: AnimatedColor,
	Interpolation: AnimatedInterpolation,
	Node: AnimatedNode,
	decay: function decay(value, config) {
		return emptyAnimation;
	},
	timing: function timing(value, config) {
		var anyValue = value;
		return _objectSpread2(_objectSpread2({}, emptyAnimation), {}, { start: mockAnimationStart((callback) => {
			anyValue.setValue(config.toValue);
			callback?.({ finished: true });
		}) });
	},
	spring: function spring(value, config) {
		var anyValue = value;
		return _objectSpread2(_objectSpread2({}, emptyAnimation), {}, { start: mockAnimationStart((callback) => {
			anyValue.setValue(config.toValue);
			callback?.({ finished: true });
		}) });
	},
	add: AnimatedImplementation_default.add,
	subtract: AnimatedImplementation_default.subtract,
	divide: AnimatedImplementation_default.divide,
	multiply: AnimatedImplementation_default.multiply,
	modulo: AnimatedImplementation_default.modulo,
	diffClamp: AnimatedImplementation_default.diffClamp,
	delay: function delay(time) {
		return emptyAnimation;
	},
	sequence: function sequence(animations) {
		return mockCompositeAnimation(animations);
	},
	parallel: function parallel(animations, config) {
		return mockCompositeAnimation(animations);
	},
	stagger: function stagger(time, animations) {
		return mockCompositeAnimation(animations);
	},
	loop: function loop(animation, _temp) {
		(_temp === void 0 ? {} : _temp).iterations;
		return emptyAnimation;
	},
	event: AnimatedImplementation_default.event,
	createAnimatedComponent,
	attachNativeEvent,
	forkEvent: AnimatedImplementation_default.forkEvent,
	unforkEvent: AnimatedImplementation_default.unforkEvent,
	Event: AnimatedEvent
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/Animated/Animated.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var Animated = Platform.isTesting ? AnimatedMock_default : AnimatedImplementation_default;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Animated/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Animated_default = _objectSpread2({
	FlatList: AnimatedFlatList_default,
	Image: AnimatedImage_default,
	ScrollView: AnimatedScrollView_default,
	SectionList: AnimatedSectionList_default,
	Text: AnimatedText_default,
	View: AnimatedView_default
}, Animated);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Appearance/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function getQuery() {
	return canUseDOM && window.matchMedia != null ? window.matchMedia("(prefers-color-scheme: dark)") : null;
}
var query = getQuery();
var listenerMapping = /* @__PURE__ */ new WeakMap();
var Appearance = {
	getColorScheme() {
		return query && query.matches ? "dark" : "light";
	},
	addChangeListener(listener) {
		var mappedListener = listenerMapping.get(listener);
		if (!mappedListener) {
			mappedListener = (_ref) => {
				var matches = _ref.matches;
				listener({ colorScheme: matches ? "dark" : "light" });
			};
			listenerMapping.set(listener, mappedListener);
		}
		if (query) query.addListener(mappedListener);
		function remove() {
			var mappedListener = listenerMapping.get(listener);
			if (query && mappedListener) query.removeListener(mappedListener);
			listenerMapping.delete(listener);
		}
		return { remove };
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/AppRegistry/AppContainer.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var RootTagContext = /*#__PURE__*/ import_react.createContext(null);
var AppContainer = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var children = props.children, WrapperComponent = props.WrapperComponent;
	var innerView = /*#__PURE__*/ import_react.createElement(View, {
		children,
		key: 1,
		style: styles$14.appContainer
	});
	if (WrapperComponent) innerView = /*#__PURE__*/ import_react.createElement(WrapperComponent, null, innerView);
	return /*#__PURE__*/ import_react.createElement(RootTagContext.Provider, { value: props.rootTag }, /*#__PURE__*/ import_react.createElement(View, {
		ref: forwardedRef,
		style: styles$14.appContainer
	}, innerView));
});
AppContainer.displayName = "AppContainer";
var styles$14 = stylesheet.create({ appContainer: {
	flex: 1,
	pointerEvents: "box-none"
} });
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/AppRegistry/renderApplication.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function renderApplication(RootComponent, WrapperComponent, callback, options) {
	var shouldHydrate = options.hydrate, initialProps = options.initialProps, rootTag = options.rootTag;
	var renderFn = shouldHydrate ? hydrate : render;
	(0, import_invariant.default)(rootTag, "Expect to have a valid rootTag, instead got ", rootTag);
	return renderFn(/*#__PURE__*/ import_react.createElement(AppContainer, {
		WrapperComponent,
		ref: callback,
		rootTag
	}, /*#__PURE__*/ import_react.createElement(RootComponent, initialProps)), rootTag);
}
function getApplication(RootComponent, initialProps, WrapperComponent) {
	var element = /*#__PURE__*/ import_react.createElement(AppContainer, {
		WrapperComponent,
		rootTag: {}
	}, /*#__PURE__*/ import_react.createElement(RootComponent, initialProps));
	var getStyleElement = (props) => {
		var sheet = stylesheet.getSheet();
		return /*#__PURE__*/ import_react.createElement("style", _extends({}, props, {
			dangerouslySetInnerHTML: { __html: sheet.textContent },
			id: sheet.id
		}));
	};
	return {
		element,
		getStyleElement
	};
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/AppRegistry/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var emptyObject$3 = {};
var runnables = {};
var componentProviderInstrumentationHook = (component) => component();
var wrapperComponentProvider;
/**
* `AppRegistry` is the JS entry point to running all React Native apps.
*/
var AppRegistry = class AppRegistry {
	static getAppKeys() {
		return Object.keys(runnables);
	}
	static getApplication(appKey, appParameters) {
		(0, import_invariant.default)(runnables[appKey] && runnables[appKey].getApplication, "Application " + appKey + " has not been registered. This is either due to an import error during initialization or failure to call AppRegistry.registerComponent.");
		return runnables[appKey].getApplication(appParameters);
	}
	static registerComponent(appKey, componentProvider) {
		runnables[appKey] = {
			getApplication: (appParameters) => getApplication(componentProviderInstrumentationHook(componentProvider), appParameters ? appParameters.initialProps : emptyObject$3, wrapperComponentProvider && wrapperComponentProvider(appParameters)),
			run: (appParameters) => renderApplication(componentProviderInstrumentationHook(componentProvider), wrapperComponentProvider && wrapperComponentProvider(appParameters), appParameters.callback, {
				hydrate: appParameters.hydrate || false,
				initialProps: appParameters.initialProps || emptyObject$3,
				mode: appParameters.mode || "concurrent",
				rootTag: appParameters.rootTag
			})
		};
		return appKey;
	}
	static registerConfig(config) {
		config.forEach((_ref) => {
			var appKey = _ref.appKey, component = _ref.component, run = _ref.run;
			if (run) AppRegistry.registerRunnable(appKey, run);
			else {
				(0, import_invariant.default)(component, "No component provider passed in");
				AppRegistry.registerComponent(appKey, component);
			}
		});
	}
	static registerRunnable(appKey, run) {
		runnables[appKey] = { run };
		return appKey;
	}
	static runApplication(appKey, appParameters) {
		var isDevelopment = true;
		if (isDevelopment) {
			var params = _objectSpread2({}, appParameters);
			params.rootTag = "#" + params.rootTag.id;
			console.log("Running application \"" + appKey + "\" with appParams:\n", params, "\nDevelopment-level warnings: " + (isDevelopment ? "ON" : "OFF") + "." + ("\nPerformance optimizations: " + (isDevelopment ? "OFF" : "ON") + "."));
		}
		(0, import_invariant.default)(runnables[appKey] && runnables[appKey].run, "Application \"" + appKey + "\" has not been registered. This is either due to an import error during initialization or failure to call AppRegistry.registerComponent.");
		return runnables[appKey].run(appParameters);
	}
	static setComponentProviderInstrumentationHook(hook) {
		componentProviderInstrumentationHook = hook;
	}
	static setWrapperComponentProvider(provider) {
		wrapperComponentProvider = provider;
	}
	static unmountApplicationComponentAtRootTag(rootTag) {
		unmountComponentAtNode(rootTag);
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/AppState/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var isPrefixed = canUseDOM && !document.hasOwnProperty("hidden") && document.hasOwnProperty("webkitHidden");
var EVENT_TYPES = ["change", "memoryWarning"];
var VISIBILITY_CHANGE_EVENT = isPrefixed ? "webkitvisibilitychange" : "visibilitychange";
var VISIBILITY_STATE_PROPERTY = isPrefixed ? "webkitVisibilityState" : "visibilityState";
var AppStates = {
	BACKGROUND: "background",
	ACTIVE: "active"
};
var changeEmitter = null;
var AppState = class AppState {
	static get currentState() {
		if (!AppState.isAvailable) return AppStates.ACTIVE;
		switch (document[VISIBILITY_STATE_PROPERTY]) {
			case "hidden":
			case "prerender":
			case "unloaded": return AppStates.BACKGROUND;
			default: return AppStates.ACTIVE;
		}
	}
	static addEventListener(type, handler) {
		if (AppState.isAvailable) {
			(0, import_invariant.default)(EVENT_TYPES.indexOf(type) !== -1, "Trying to subscribe to unknown event: \"%s\"", type);
			if (type === "change") {
				if (!changeEmitter) {
					changeEmitter = new EventEmitter();
					document.addEventListener(VISIBILITY_CHANGE_EVENT, () => {
						if (changeEmitter) changeEmitter.emit("change", AppState.currentState);
					}, false);
				}
				return changeEmitter.addListener(type, handler);
			}
		}
	}
};
AppState.isAvailable = canUseDOM && !!document[VISIBILITY_STATE_PROPERTY];
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/BackHandler/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function emptyFunction$2() {}
var BackHandler = {
	exitApp: emptyFunction$2,
	addEventListener() {
		console.error("BackHandler is not supported on web and should not be used.");
		return { remove: emptyFunction$2 };
	},
	removeEventListener: emptyFunction$2
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Clipboard/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var clipboardAvailable;
var Clipboard = class {
	static isAvailable() {
		if (clipboardAvailable === void 0) clipboardAvailable = typeof document.queryCommandSupported === "function" && document.queryCommandSupported("copy");
		return clipboardAvailable;
	}
	static getString() {
		return Promise.resolve("");
	}
	static setString(text) {
		var success = false;
		var body = document.body;
		if (body) {
			var node = document.createElement("span");
			node.textContent = text;
			node.style.opacity = "0";
			node.style.position = "absolute";
			node.style.whiteSpace = "pre-wrap";
			node.style.userSelect = "auto";
			body.appendChild(node);
			var selection = window.getSelection();
			selection.removeAllRanges();
			var range = document.createRange();
			range.selectNodeContents(node);
			selection.addRange(range);
			try {
				document.execCommand("copy");
				success = true;
			} catch (e) {}
			selection.removeAllRanges();
			body.removeChild(node);
		}
		return success;
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/I18nManager/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var I18nManager = {
	allowRTL() {},
	forceRTL() {},
	getConstants() {
		return { isRTL: false };
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Keyboard/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Keyboard = {
	isVisible() {
		return false;
	},
	addListener() {
		return { remove: () => {} };
	},
	dismiss() {
		dismissKeyboard();
	},
	removeAllListeners() {},
	removeListener() {}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/LayoutAnimation/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
function configureNext(config, onAnimationDidEnd) {
	if (!Platform.isTesting) UIManager.configureNextLayoutAnimation(config, onAnimationDidEnd !== null && onAnimationDidEnd !== void 0 ? onAnimationDidEnd : function() {}, function() {});
}
function create(duration, type, property) {
	return {
		duration,
		create: {
			type,
			property
		},
		update: { type },
		delete: {
			type,
			property
		}
	};
}
var Presets = {
	easeInEaseOut: create(300, "easeInEaseOut", "opacity"),
	linear: create(500, "linear", "opacity"),
	spring: {
		duration: 700,
		create: {
			type: "linear",
			property: "opacity"
		},
		update: {
			type: "spring",
			springDamping: .4
		},
		delete: {
			type: "linear",
			property: "opacity"
		}
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/LayoutAnimation/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var LayoutAnimation_default = {
	/**
	* Schedules an animation to happen on the next layout.
	*
	* @param config Specifies animation properties:
	*
	*   - `duration` in milliseconds
	*   - `create`, `AnimationConfig` for animating in new views
	*   - `update`, `AnimationConfig` for animating views that have been updated
	*
	* @param onAnimationDidEnd Called when the animation finished.
	* Only supported on iOS.
	* @param onError Called on error. Only supported on iOS.
	*/
	configureNext,
	/**
	* Helper for creating a config for `configureNext`.
	*/
	create,
	Types: Object.freeze({
		spring: "spring",
		linear: "linear",
		easeInEaseOut: "easeInEaseOut",
		easeIn: "easeIn",
		easeOut: "easeOut",
		keyboard: "keyboard"
	}),
	Properties: Object.freeze({
		opacity: "opacity",
		scaleX: "scaleX",
		scaleY: "scaleY",
		scaleXY: "scaleXY"
	}),
	checkConfig() {
		console.error("LayoutAnimation.checkConfig(...) has been disabled.");
	},
	Presets,
	easeInEaseOut: configureNext.bind(null, Presets.easeInEaseOut),
	linear: configureNext.bind(null, Presets.linear),
	spring: configureNext.bind(null, Presets.spring)
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Linking/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var initialURL = canUseDOM ? window.location.href : "";
var Linking = class {
	constructor() {
		this._eventCallbacks = {};
	}
	/**
	* An object mapping of event name
	* and all the callbacks subscribing to it
	*/
	_dispatchEvent(event) {
		for (var _len = arguments.length, data = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) data[_key - 1] = arguments[_key];
		var listeners = this._eventCallbacks[event];
		if (listeners != null && Array.isArray(listeners)) listeners.map((listener) => {
			listener(...data);
		});
	}
	/**
	* Adds a event listener for the specified event. The callback will be called when the
	* said event is dispatched.
	*/
	addEventListener(eventType, callback) {
		var _this = this;
		if (!_this._eventCallbacks[eventType]) _this._eventCallbacks[eventType] = [callback];
		_this._eventCallbacks[eventType].push(callback);
		return { remove() {
			var filteredCallbacks = _this._eventCallbacks[eventType].filter((c) => c.toString() !== callback.toString());
			_this._eventCallbacks[eventType] = filteredCallbacks;
		} };
	}
	/**
	* Removes a previously added event listener for the specified event. The callback must
	* be the same object as the one passed to `addEventListener`.
	*/
	removeEventListener(eventType, callback) {
		console.error("Linking.removeEventListener('" + eventType + "', ...): Method has been deprecated. Please instead use `remove()` on the subscription returned by `Linking.addEventListener`.");
		var filteredCallbacks = this._eventCallbacks[eventType].filter((c) => c.toString() !== callback.toString());
		this._eventCallbacks[eventType] = filteredCallbacks;
	}
	canOpenURL() {
		return Promise.resolve(true);
	}
	getInitialURL() {
		return Promise.resolve(initialURL);
	}
	/**
	* Try to open the given url in a secure fashion. The method returns a Promise object.
	* If a target is passed (including undefined) that target will be used, otherwise '_blank'.
	* If the url opens, the promise is resolved. If not, the promise is rejected.
	* Dispatches the `onOpen` event if `url` is opened successfully.
	*/
	openURL(url, target) {
		if (arguments.length === 1) target = "_blank";
		try {
			open(url, target);
			this._dispatchEvent("onOpen", url);
			return Promise.resolve();
		} catch (e) {
			return Promise.reject(e);
		}
	}
	_validateURL(url) {
		(0, import_invariant.default)(typeof url === "string", "Invalid URL: should be a string. Was: " + url);
		(0, import_invariant.default)(url, "Invalid URL: cannot be empty");
	}
};
var open = (url, target) => {
	if (canUseDOM) {
		var urlToOpen = new URL(url, window.location).toString();
		if (urlToOpen.indexOf("tel:") === 0) window.location = urlToOpen;
		else window.open(urlToOpen, target, "noopener");
	}
};
var Linking_default = new Linking();
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/NativeEventEmitter/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var NativeEventEmitter_default = NativeEventEmitter;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/TouchHistoryMath/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
*/
var TouchHistoryMath = {
	/**
	* This code is optimized and not intended to look beautiful. This allows
	* computing of touch centroids that have moved after `touchesChangedAfter`
	* timeStamp. You can compute the current centroid involving all touches
	* moves after `touchesChangedAfter`, or you can compute the previous
	* centroid of all touches that were moved after `touchesChangedAfter`.
	*
	* @param {TouchHistoryMath} touchHistory Standard Responder touch track
	* data.
	* @param {number} touchesChangedAfter timeStamp after which moved touches
	* are considered "actively moving" - not just "active".
	* @param {boolean} isXAxis Consider `x` dimension vs. `y` dimension.
	* @param {boolean} ofCurrent Compute current centroid for actively moving
	* touches vs. previous centroid of now actively moving touches.
	* @return {number} value of centroid in specified dimension.
	*/
	centroidDimension: function centroidDimension(touchHistory, touchesChangedAfter, isXAxis, ofCurrent) {
		var touchBank = touchHistory.touchBank;
		var total = 0;
		var count = 0;
		var oneTouchData = touchHistory.numberActiveTouches === 1 ? touchHistory.touchBank[touchHistory.indexOfSingleActiveTouch] : null;
		if (oneTouchData !== null) {
			if (oneTouchData.touchActive && oneTouchData.currentTimeStamp > touchesChangedAfter) {
				total += ofCurrent && isXAxis ? oneTouchData.currentPageX : ofCurrent && !isXAxis ? oneTouchData.currentPageY : !ofCurrent && isXAxis ? oneTouchData.previousPageX : oneTouchData.previousPageY;
				count = 1;
			}
		} else for (var i = 0; i < touchBank.length; i++) {
			var touchTrack = touchBank[i];
			if (touchTrack !== null && touchTrack !== void 0 && touchTrack.touchActive && touchTrack.currentTimeStamp >= touchesChangedAfter) {
				var toAdd = void 0;
				if (ofCurrent && isXAxis) toAdd = touchTrack.currentPageX;
				else if (ofCurrent && !isXAxis) toAdd = touchTrack.currentPageY;
				else if (!ofCurrent && isXAxis) toAdd = touchTrack.previousPageX;
				else toAdd = touchTrack.previousPageY;
				total += toAdd;
				count++;
			}
		}
		return count > 0 ? total / count : TouchHistoryMath.noCentroid;
	},
	currentCentroidXOfTouchesChangedAfter: function currentCentroidXOfTouchesChangedAfter(touchHistory, touchesChangedAfter) {
		return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, true, true);
	},
	currentCentroidYOfTouchesChangedAfter: function currentCentroidYOfTouchesChangedAfter(touchHistory, touchesChangedAfter) {
		return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, false, true);
	},
	previousCentroidXOfTouchesChangedAfter: function previousCentroidXOfTouchesChangedAfter(touchHistory, touchesChangedAfter) {
		return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, true, false);
	},
	previousCentroidYOfTouchesChangedAfter: function previousCentroidYOfTouchesChangedAfter(touchHistory, touchesChangedAfter) {
		return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, false, false);
	},
	currentCentroidX: function currentCentroidX(touchHistory) {
		return TouchHistoryMath.centroidDimension(touchHistory, 0, true, true);
	},
	currentCentroidY: function currentCentroidY(touchHistory) {
		return TouchHistoryMath.centroidDimension(touchHistory, 0, false, true);
	},
	noCentroid: -1
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/PanResponder/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var currentCentroidXOfTouchesChangedAfter = TouchHistoryMath.currentCentroidXOfTouchesChangedAfter;
var currentCentroidYOfTouchesChangedAfter = TouchHistoryMath.currentCentroidYOfTouchesChangedAfter;
var previousCentroidXOfTouchesChangedAfter = TouchHistoryMath.previousCentroidXOfTouchesChangedAfter;
var previousCentroidYOfTouchesChangedAfter = TouchHistoryMath.previousCentroidYOfTouchesChangedAfter;
var currentCentroidX = TouchHistoryMath.currentCentroidX;
var currentCentroidY = TouchHistoryMath.currentCentroidY;
/**
* `PanResponder` reconciles several touches into a single gesture. It makes
* single-touch gestures resilient to extra touches, and can be used to
* recognize simple multi-touch gestures.
*
* By default, `PanResponder` holds an `InteractionManager` handle to block
* long-running JS events from interrupting active gestures.
*
* It provides a predictable wrapper of the responder handlers provided by the
* [gesture responder system](docs/gesture-responder-system.html).
* For each handler, it provides a new `gestureState` object alongside the
* native event object:
*
* ```
* onPanResponderMove: (event, gestureState) => {}
* ```
*
* A native event is a synthetic touch event with the following form:
*
*  - `nativeEvent`
*      + `changedTouches` - Array of all touch events that have changed since the last event
*      + `identifier` - The ID of the touch
*      + `locationX` - The X position of the touch, relative to the element
*      + `locationY` - The Y position of the touch, relative to the element
*      + `pageX` - The X position of the touch, relative to the root element
*      + `pageY` - The Y position of the touch, relative to the root element
*      + `target` - The node id of the element receiving the touch event
*      + `timestamp` - A time identifier for the touch, useful for velocity calculation
*      + `touches` - Array of all current touches on the screen
*
* A `gestureState` object has the following:
*
*  - `stateID` - ID of the gestureState- persisted as long as there at least
*     one touch on screen
*  - `moveX` - the latest screen coordinates of the recently-moved touch
*  - `moveY` - the latest screen coordinates of the recently-moved touch
*  - `x0` - the screen coordinates of the responder grant
*  - `y0` - the screen coordinates of the responder grant
*  - `dx` - accumulated distance of the gesture since the touch started
*  - `dy` - accumulated distance of the gesture since the touch started
*  - `vx` - current velocity of the gesture
*  - `vy` - current velocity of the gesture
*  - `numberActiveTouches` - Number of touches currently on screen
*
* ### Basic Usage
*
* ```
*   componentWillMount: function() {
*     this._panResponder = PanResponder.create({
*       // Ask to be the responder:
*       onStartShouldSetPanResponder: (evt, gestureState) => true,
*       onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
*       onMoveShouldSetPanResponder: (evt, gestureState) => true,
*       onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
*
*       onPanResponderGrant: (evt, gestureState) => {
*         // The gesture has started. Show visual feedback so the user knows
*         // what is happening!
*
*         // gestureState.d{x,y} will be set to zero now
*       },
*       onPanResponderMove: (evt, gestureState) => {
*         // The most recent move distance is gestureState.move{X,Y}
*
*         // The accumulated gesture distance since becoming responder is
*         // gestureState.d{x,y}
*       },
*       onPanResponderTerminationRequest: (evt, gestureState) => true,
*       onPanResponderRelease: (evt, gestureState) => {
*         // The user has released all touches while this view is the
*         // responder. This typically means a gesture has succeeded
*       },
*       onPanResponderTerminate: (evt, gestureState) => {
*         // Another component has become the responder, so this gesture
*         // should be cancelled
*       },
*       onShouldBlockNativeResponder: (evt, gestureState) => {
*         // Returns whether this component should block native components from becoming the JS
*         // responder. Returns true by default. Is currently only supported on android.
*         return true;
*       },
*     });
*   },
*
*   render: function() {
*     return (
*       <View {...this._panResponder.panHandlers} />
*     );
*   },
*
* ```
*
* ### Working Example
*
* To see it in action, try the
* [PanResponder example in RNTester](https://github.com/facebook/react-native/blob/master/RNTester/js/PanResponderExample.js)
*/
var PanResponder = {
	/**
	*
	* A graphical explanation of the touch data flow:
	*
	* +----------------------------+             +--------------------------------+
	* | ResponderTouchHistoryStore |             |TouchHistoryMath                |
	* +----------------------------+             +----------+---------------------+
	* |Global store of touchHistory|             |Allocation-less math util       |
	* |including activeness, start |             |on touch history (centroids     |
	* |position, prev/cur position.|             |and multitouch movement etc)    |
	* |                            |             |                                |
	* +----^-----------------------+             +----^---------------------------+
	*      |                                          |
	*      | (records relevant history                |
	*      |  of touches relevant for                 |
	*      |  implementing higher level               |
	*      |  gestures)                               |
	*      |                                          |
	* +----+-----------------------+             +----|---------------------------+
	* | ResponderEventPlugin       |             |    |   Your App/Component      |
	* +----------------------------+             +----|---------------------------+
	* |Negotiates which view gets  | Low level   |    |             High level    |
	* |onResponderMove events.     | events w/   |  +-+-------+     events w/     |
	* |Also records history into   | touchHistory|  |   Pan   |     multitouch +  |
	* |ResponderTouchHistoryStore. +---------------->Responder+-----> accumulative|
	* +----------------------------+ attached to |  |         |     distance and  |
	*                                 each event |  +---------+     velocity.     |
	*                                            |                                |
	*                                            |                                |
	*                                            +--------------------------------+
	*
	*
	*
	* Gesture that calculates cumulative movement over time in a way that just
	* "does the right thing" for multiple touches. The "right thing" is very
	* nuanced. When moving two touches in opposite directions, the cumulative
	* distance is zero in each dimension. When two touches move in parallel five
	* pixels in the same direction, the cumulative distance is five, not ten. If
	* two touches start, one moves five in a direction, then stops and the other
	* touch moves fives in the same direction, the cumulative distance is ten.
	*
	* This logic requires a kind of processing of time "clusters" of touch events
	* so that two touch moves that essentially occur in parallel but move every
	* other frame respectively, are considered part of the same movement.
	*
	* Explanation of some of the non-obvious fields:
	*
	* - moveX/moveY: If no move event has been observed, then `(moveX, moveY)` is
	*   invalid. If a move event has been observed, `(moveX, moveY)` is the
	*   centroid of the most recently moved "cluster" of active touches.
	*   (Currently all move have the same timeStamp, but later we should add some
	*   threshold for what is considered to be "moving"). If a palm is
	*   accidentally counted as a touch, but a finger is moving greatly, the palm
	*   will move slightly, but we only want to count the single moving touch.
	* - x0/y0: Centroid location (non-cumulative) at the time of becoming
	*   responder.
	* - dx/dy: Cumulative touch distance - not the same thing as sum of each touch
	*   distance. Accounts for touch moves that are clustered together in time,
	*   moving the same direction. Only valid when currently responder (otherwise,
	*   it only represents the drag distance below the threshold).
	* - vx/vy: Velocity.
	*/
	_initializeGestureState(gestureState) {
		gestureState.moveX = 0;
		gestureState.moveY = 0;
		gestureState.x0 = 0;
		gestureState.y0 = 0;
		gestureState.dx = 0;
		gestureState.dy = 0;
		gestureState.vx = 0;
		gestureState.vy = 0;
		gestureState.numberActiveTouches = 0;
		gestureState._accountsForMovesUpTo = 0;
	},
	/**
	* This is nuanced and is necessary. It is incorrect to continuously take all
	* active *and* recently moved touches, find the centroid, and track how that
	* result changes over time. Instead, we must take all recently moved
	* touches, and calculate how the centroid has changed just for those
	* recently moved touches, and append that change to an accumulator. This is
	* to (at least) handle the case where the user is moving three fingers, and
	* then one of the fingers stops but the other two continue.
	*
	* This is very different than taking all of the recently moved touches and
	* storing their centroid as `dx/dy`. For correctness, we must *accumulate
	* changes* in the centroid of recently moved touches.
	*
	* There is also some nuance with how we handle multiple moved touches in a
	* single event. With the way `ReactNativeEventEmitter` dispatches touches as
	* individual events, multiple touches generate two 'move' events, each of
	* them triggering `onResponderMove`. But with the way `PanResponder` works,
	* all of the gesture inference is performed on the first dispatch, since it
	* looks at all of the touches (even the ones for which there hasn't been a
	* native dispatch yet). Therefore, `PanResponder` does not call
	* `onResponderMove` passed the first dispatch. This diverges from the
	* typical responder callback pattern (without using `PanResponder`), but
	* avoids more dispatches than necessary.
	*/
	_updateGestureStateOnMove(gestureState, touchHistory) {
		gestureState.numberActiveTouches = touchHistory.numberActiveTouches;
		gestureState.moveX = currentCentroidXOfTouchesChangedAfter(touchHistory, gestureState._accountsForMovesUpTo);
		gestureState.moveY = currentCentroidYOfTouchesChangedAfter(touchHistory, gestureState._accountsForMovesUpTo);
		var movedAfter = gestureState._accountsForMovesUpTo;
		var prevX = previousCentroidXOfTouchesChangedAfter(touchHistory, movedAfter);
		var x = currentCentroidXOfTouchesChangedAfter(touchHistory, movedAfter);
		var prevY = previousCentroidYOfTouchesChangedAfter(touchHistory, movedAfter);
		var y = currentCentroidYOfTouchesChangedAfter(touchHistory, movedAfter);
		var nextDX = gestureState.dx + (x - prevX);
		var nextDY = gestureState.dy + (y - prevY);
		var dt = touchHistory.mostRecentTimeStamp - gestureState._accountsForMovesUpTo;
		gestureState.vx = (nextDX - gestureState.dx) / dt;
		gestureState.vy = (nextDY - gestureState.dy) / dt;
		gestureState.dx = nextDX;
		gestureState.dy = nextDY;
		gestureState._accountsForMovesUpTo = touchHistory.mostRecentTimeStamp;
	},
	/**
	* @param {object} config Enhanced versions of all of the responder callbacks
	* that provide not only the typical `ResponderSyntheticEvent`, but also the
	* `PanResponder` gesture state.  Simply replace the word `Responder` with
	* `PanResponder` in each of the typical `onResponder*` callbacks. For
	* example, the `config` object would look like:
	*
	*  - `onMoveShouldSetPanResponder: (e, gestureState) => {...}`
	*  - `onMoveShouldSetPanResponderCapture: (e, gestureState) => {...}`
	*  - `onStartShouldSetPanResponder: (e, gestureState) => {...}`
	*  - `onStartShouldSetPanResponderCapture: (e, gestureState) => {...}`
	*  - `onPanResponderReject: (e, gestureState) => {...}`
	*  - `onPanResponderGrant: (e, gestureState) => {...}`
	*  - `onPanResponderStart: (e, gestureState) => {...}`
	*  - `onPanResponderEnd: (e, gestureState) => {...}`
	*  - `onPanResponderRelease: (e, gestureState) => {...}`
	*  - `onPanResponderMove: (e, gestureState) => {...}`
	*  - `onPanResponderTerminate: (e, gestureState) => {...}`
	*  - `onPanResponderTerminationRequest: (e, gestureState) => {...}`
	*  - `onShouldBlockNativeResponder: (e, gestureState) => {...}`
	*
	*  In general, for events that have capture equivalents, we update the
	*  gestureState once in the capture phase and can use it in the bubble phase
	*  as well.
	*
	*  Be careful with onStartShould* callbacks. They only reflect updated
	*  `gestureState` for start/end events that bubble/capture to the Node.
	*  Once the node is the responder, you can rely on every start/end event
	*  being processed by the gesture and `gestureState` being updated
	*  accordingly. (numberActiveTouches) may not be totally accurate unless you
	*  are the responder.
	*/
	create(config) {
		var interactionState = {
			handle: null,
			shouldCancelClick: false,
			timeout: null
		};
		var gestureState = {
			stateID: Math.random(),
			moveX: 0,
			moveY: 0,
			x0: 0,
			y0: 0,
			dx: 0,
			dy: 0,
			vx: 0,
			vy: 0,
			numberActiveTouches: 0,
			_accountsForMovesUpTo: 0
		};
		return {
			panHandlers: {
				onStartShouldSetResponder(event) {
					return config.onStartShouldSetPanResponder == null ? false : config.onStartShouldSetPanResponder(event, gestureState);
				},
				onMoveShouldSetResponder(event) {
					return config.onMoveShouldSetPanResponder == null ? false : config.onMoveShouldSetPanResponder(event, gestureState);
				},
				onStartShouldSetResponderCapture(event) {
					if (event.nativeEvent.touches.length === 1) PanResponder._initializeGestureState(gestureState);
					gestureState.numberActiveTouches = event.touchHistory.numberActiveTouches;
					return config.onStartShouldSetPanResponderCapture != null ? config.onStartShouldSetPanResponderCapture(event, gestureState) : false;
				},
				onMoveShouldSetResponderCapture(event) {
					var touchHistory = event.touchHistory;
					if (gestureState._accountsForMovesUpTo === touchHistory.mostRecentTimeStamp) return false;
					PanResponder._updateGestureStateOnMove(gestureState, touchHistory);
					return config.onMoveShouldSetPanResponderCapture ? config.onMoveShouldSetPanResponderCapture(event, gestureState) : false;
				},
				onResponderGrant(event) {
					if (!interactionState.handle) interactionState.handle = InteractionManager.createInteractionHandle();
					if (interactionState.timeout) clearInteractionTimeout(interactionState);
					interactionState.shouldCancelClick = true;
					gestureState.x0 = currentCentroidX(event.touchHistory);
					gestureState.y0 = currentCentroidY(event.touchHistory);
					gestureState.dx = 0;
					gestureState.dy = 0;
					if (config.onPanResponderGrant) config.onPanResponderGrant(event, gestureState);
					return config.onShouldBlockNativeResponder == null ? true : config.onShouldBlockNativeResponder(event, gestureState);
				},
				onResponderReject(event) {
					clearInteractionHandle(interactionState, config.onPanResponderReject, event, gestureState);
				},
				onResponderRelease(event) {
					clearInteractionHandle(interactionState, config.onPanResponderRelease, event, gestureState);
					setInteractionTimeout(interactionState);
					PanResponder._initializeGestureState(gestureState);
				},
				onResponderStart(event) {
					gestureState.numberActiveTouches = event.touchHistory.numberActiveTouches;
					if (config.onPanResponderStart) config.onPanResponderStart(event, gestureState);
				},
				onResponderMove(event) {
					var touchHistory = event.touchHistory;
					if (gestureState._accountsForMovesUpTo === touchHistory.mostRecentTimeStamp) return;
					PanResponder._updateGestureStateOnMove(gestureState, touchHistory);
					if (config.onPanResponderMove) config.onPanResponderMove(event, gestureState);
				},
				onResponderEnd(event) {
					gestureState.numberActiveTouches = event.touchHistory.numberActiveTouches;
					clearInteractionHandle(interactionState, config.onPanResponderEnd, event, gestureState);
				},
				onResponderTerminate(event) {
					clearInteractionHandle(interactionState, config.onPanResponderTerminate, event, gestureState);
					setInteractionTimeout(interactionState);
					PanResponder._initializeGestureState(gestureState);
				},
				onResponderTerminationRequest(event) {
					return config.onPanResponderTerminationRequest == null ? true : config.onPanResponderTerminationRequest(event, gestureState);
				},
				onClickCapture: (event) => {
					if (interactionState.shouldCancelClick === true) {
						event.stopPropagation();
						event.preventDefault();
					}
				}
			},
			getInteractionHandle() {
				return interactionState.handle;
			}
		};
	}
};
function clearInteractionHandle(interactionState, callback, event, gestureState) {
	if (interactionState.handle) {
		InteractionManager.clearInteractionHandle(interactionState.handle);
		interactionState.handle = null;
	}
	if (callback) callback(event, gestureState);
}
function clearInteractionTimeout(interactionState) {
	clearTimeout(interactionState.timeout);
}
function setInteractionTimeout(interactionState) {
	interactionState.timeout = setTimeout(() => {
		interactionState.shouldCancelClick = false;
	}, 250);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/PanResponder/index.js
var PanResponder_default = PanResponder;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Share/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Share = class {
	static share(content, options) {
		if (options === void 0) options = {};
		(0, import_invariant.default)(typeof content === "object" && content !== null, "Content to share must be a valid object");
		(0, import_invariant.default)(typeof content.url === "string" || typeof content.message === "string", "At least one of URL and message is required");
		(0, import_invariant.default)(typeof options === "object" && options !== null, "Options must be a valid object");
		(0, import_invariant.default)(!content.title || typeof content.title === "string", "Invalid title: title should be a string.");
		if (window.navigator.share !== void 0) return window.navigator.share({
			title: content.title,
			text: content.message,
			url: content.url
		});
		else return Promise.reject(/* @__PURE__ */ new Error("Share is not supported in this browser"));
	}
	/**
	* The content was successfully shared.
	*/
	static get sharedAction() {
		return "sharedAction";
	}
	/**
	* The dialog has been dismissed.
	* @platform ios
	*/
	static get dismissedAction() {
		return "dismissedAction";
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Vibration/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var vibrate = (pattern) => {
	if ("vibrate" in window.navigator) window.navigator.vibrate(pattern);
};
var Vibration = {
	cancel() {
		vibrate(0);
	},
	vibrate(pattern) {
		if (pattern === void 0) pattern = 400;
		vibrate(pattern);
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/ActivityIndicator/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$13 = [
	"animating",
	"color",
	"hidesWhenStopped",
	"size",
	"style"
];
var createSvgCircle = (style) => /*#__PURE__*/ import_react.createElement("circle", {
	cx: "16",
	cy: "16",
	fill: "none",
	r: "14",
	strokeWidth: "4",
	style
});
var ActivityIndicator = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var _props$animating = props.animating, animating = _props$animating === void 0 ? true : _props$animating, _props$color = props.color, color = _props$color === void 0 ? "#1976D2" : _props$color, _props$hidesWhenStopp = props.hidesWhenStopped, hidesWhenStopped = _props$hidesWhenStopp === void 0 ? true : _props$hidesWhenStopp, _props$size = props.size, size = _props$size === void 0 ? "small" : _props$size, style = props.style, other = _objectWithoutPropertiesLoose(props, _excluded$13);
	var svg = /*#__PURE__*/ import_react.createElement("svg", {
		height: "100%",
		viewBox: "0 0 32 32",
		width: "100%"
	}, createSvgCircle({
		stroke: color,
		opacity: .2
	}), createSvgCircle({
		stroke: color,
		strokeDasharray: 80,
		strokeDashoffset: 60
	}));
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, other, {
		"aria-valuemax": 1,
		"aria-valuemin": 0,
		ref: forwardedRef,
		role: "progressbar",
		style: [styles$13.container, style]
	}), /*#__PURE__*/ import_react.createElement(View, {
		children: svg,
		style: [
			typeof size === "number" ? {
				height: size,
				width: size
			} : indicatorSizes[size],
			styles$13.animation,
			!animating && styles$13.animationPause,
			!animating && hidesWhenStopped && styles$13.hidesWhenStopped
		]
	}));
});
ActivityIndicator.displayName = "ActivityIndicator";
var styles$13 = stylesheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center"
	},
	hidesWhenStopped: { visibility: "hidden" },
	animation: {
		animationDuration: "0.75s",
		animationKeyframes: [{
			"0%": { transform: "rotate(0deg)" },
			"100%": { transform: "rotate(360deg)" }
		}],
		animationTimingFunction: "linear",
		animationIterationCount: "infinite"
	},
	animationPause: { animationPlayState: "paused" }
});
var indicatorSizes = stylesheet.create({
	small: {
		width: 20,
		height: 20
	},
	large: {
		width: 36,
		height: 36
	}
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/usePressEvents/PressResponder.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var DELAY = "DELAY";
var ERROR = "ERROR";
var LONG_PRESS_DETECTED = "LONG_PRESS_DETECTED";
var NOT_RESPONDER = "NOT_RESPONDER";
var RESPONDER_ACTIVE_LONG_PRESS_START = "RESPONDER_ACTIVE_LONG_PRESS_START";
var RESPONDER_ACTIVE_PRESS_START = "RESPONDER_ACTIVE_PRESS_START";
var RESPONDER_INACTIVE_PRESS_START = "RESPONDER_INACTIVE_PRESS_START";
var RESPONDER_GRANT = "RESPONDER_GRANT";
var RESPONDER_RELEASE = "RESPONDER_RELEASE";
var RESPONDER_TERMINATED = "RESPONDER_TERMINATED";
var Transitions$1 = Object.freeze({
	NOT_RESPONDER: {
		DELAY: ERROR,
		RESPONDER_GRANT: RESPONDER_INACTIVE_PRESS_START,
		RESPONDER_RELEASE: ERROR,
		RESPONDER_TERMINATED: ERROR,
		LONG_PRESS_DETECTED: ERROR
	},
	RESPONDER_INACTIVE_PRESS_START: {
		DELAY: RESPONDER_ACTIVE_PRESS_START,
		RESPONDER_GRANT: ERROR,
		RESPONDER_RELEASE: NOT_RESPONDER,
		RESPONDER_TERMINATED: NOT_RESPONDER,
		LONG_PRESS_DETECTED: ERROR
	},
	RESPONDER_ACTIVE_PRESS_START: {
		DELAY: ERROR,
		RESPONDER_GRANT: ERROR,
		RESPONDER_RELEASE: NOT_RESPONDER,
		RESPONDER_TERMINATED: NOT_RESPONDER,
		LONG_PRESS_DETECTED: RESPONDER_ACTIVE_LONG_PRESS_START
	},
	RESPONDER_ACTIVE_LONG_PRESS_START: {
		DELAY: ERROR,
		RESPONDER_GRANT: ERROR,
		RESPONDER_RELEASE: NOT_RESPONDER,
		RESPONDER_TERMINATED: NOT_RESPONDER,
		LONG_PRESS_DETECTED: RESPONDER_ACTIVE_LONG_PRESS_START
	},
	ERROR: {
		DELAY: NOT_RESPONDER,
		RESPONDER_GRANT: RESPONDER_INACTIVE_PRESS_START,
		RESPONDER_RELEASE: NOT_RESPONDER,
		RESPONDER_TERMINATED: NOT_RESPONDER,
		LONG_PRESS_DETECTED: NOT_RESPONDER
	}
});
var getElementRole = (element) => element.getAttribute("role");
var getElementType = (element) => element.tagName.toLowerCase();
var isActiveSignal = (signal) => signal === RESPONDER_ACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_LONG_PRESS_START;
var isButtonRole = (element) => getElementRole(element) === "button";
var isPressStartSignal = (signal) => signal === RESPONDER_INACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_LONG_PRESS_START;
var isTerminalSignal = (signal) => signal === RESPONDER_TERMINATED || signal === RESPONDER_RELEASE;
var isValidKeyPress = (event) => {
	var key = event.key, target = event.target;
	var isSpacebar = key === " " || key === "Spacebar";
	var isButtonish = getElementType(target) === "button" || isButtonRole(target);
	return key === "Enter" || isSpacebar && isButtonish;
};
var DEFAULT_LONG_PRESS_DELAY_MS = 450;
var DEFAULT_PRESS_DELAY_MS = 50;
/**
* =========================== PressResponder Tutorial ===========================
*
* The `PressResponder` class helps you create press interactions by analyzing the
* geometry of elements and observing when another responder (e.g. ScrollView)
* has stolen the touch lock. It offers hooks for your component to provide
* interaction feedback to the user:
*
* - When a press has activated (e.g. highlight an element)
* - When a press has deactivated (e.g. un-highlight an element)
* - When a press sould trigger an action, meaning it activated and deactivated
*   while within the geometry of the element without the lock being stolen.
*
* A high quality interaction isn't as simple as you might think. There should
* be a slight delay before activation. Moving your finger beyond an element's
* bounds should trigger deactivation, but moving the same finger back within an
* element's bounds should trigger reactivation.
*
* In order to use `PressResponder`, do the following:
*
*     const pressResponder = new PressResponder(config);
*
* 2. Choose the rendered component who should collect the press events. On that
*    element, spread `pressability.getEventHandlers()` into its props.
*
*    return (
*      <View {...this.state.pressResponder.getEventHandlers()} />
*    );
*
* 3. Reset `PressResponder` when your component unmounts.
*
*    componentWillUnmount() {
*      this.state.pressResponder.reset();
*    }
*
* ==================== Implementation Details ====================
*
* `PressResponder` only assumes that there exists a `HitRect` node. The `PressRect`
* is an abstract box that is extended beyond the `HitRect`.
*
* # Geometry
*
*  ┌────────────────────────┐
*  │  ┌──────────────────┐  │ - Presses start anywhere within `HitRect`.
*  │  │  ┌────────────┐  │  │
*  │  │  │ VisualRect │  │  │
*  │  │  └────────────┘  │  │ - When pressed down for sufficient amount of time
*  │  │    HitRect       │  │   before letting up, `VisualRect` activates.
*  │  └──────────────────┘  │
*  │       Out Region   o   │
*  └────────────────────│───┘
*                       └────── When the press is released outside the `HitRect`,
*                               the responder is NOT eligible for a "press".
*
* # State Machine
*
* ┌───────────────┐ ◀──── RESPONDER_RELEASE
* │ NOT_RESPONDER │
* └───┬───────────┘ ◀──── RESPONDER_TERMINATED
*     │
*     │ RESPONDER_GRANT (HitRect)
*     │
*     ▼
* ┌─────────────────────┐          ┌───────────────────┐              ┌───────────────────┐
* │ RESPONDER_INACTIVE_ │  DELAY   │ RESPONDER_ACTIVE_ │  T + DELAY   │ RESPONDER_ACTIVE_ │
* │ PRESS_START         ├────────▶ │ PRESS_START       ├────────────▶ │ LONG_PRESS_START  │
* └─────────────────────┘          └───────────────────┘              └───────────────────┘
*
* T + DELAY => LONG_PRESS_DELAY + DELAY
*
* Not drawn are the side effects of each transition. The most important side
* effect is the invocation of `onLongPress`. Only when the browser produces a
* `click` event is `onPress` invoked.
*/
var PressResponder = class {
	constructor(config) {
		this._eventHandlers = null;
		this._isPointerTouch = false;
		this._longPressDelayTimeout = null;
		this._longPressDispatched = false;
		this._pressDelayTimeout = null;
		this._pressOutDelayTimeout = null;
		this._touchState = NOT_RESPONDER;
		this._responderElement = null;
		this.configure(config);
	}
	configure(config) {
		this._config = config;
	}
	/**
	* Resets any pending timers. This should be called on unmount.
	*/
	reset() {
		this._cancelLongPressDelayTimeout();
		this._cancelPressDelayTimeout();
		this._cancelPressOutDelayTimeout();
	}
	/**
	* Returns a set of props to spread into the interactive element.
	*/
	getEventHandlers() {
		if (this._eventHandlers == null) this._eventHandlers = this._createEventHandlers();
		return this._eventHandlers;
	}
	_createEventHandlers() {
		var start = (event, shouldDelay) => {
			event.persist();
			this._cancelPressOutDelayTimeout();
			this._longPressDispatched = false;
			this._selectionTerminated = false;
			this._touchState = NOT_RESPONDER;
			this._isPointerTouch = event.nativeEvent.type === "touchstart";
			this._receiveSignal(RESPONDER_GRANT, event);
			var delayPressStart = normalizeDelay(this._config.delayPressStart, 0, DEFAULT_PRESS_DELAY_MS);
			if (shouldDelay !== false && delayPressStart > 0) this._pressDelayTimeout = setTimeout(() => {
				this._receiveSignal(DELAY, event);
			}, delayPressStart);
			else this._receiveSignal(DELAY, event);
			var delayLongPress = normalizeDelay(this._config.delayLongPress, 10, DEFAULT_LONG_PRESS_DELAY_MS);
			this._longPressDelayTimeout = setTimeout(() => {
				this._handleLongPress(event);
			}, delayLongPress + delayPressStart);
		};
		var end = (event) => {
			this._receiveSignal(RESPONDER_RELEASE, event);
		};
		var keyupHandler = (event) => {
			var onPress = this._config.onPress;
			var target = event.target;
			if (this._touchState !== NOT_RESPONDER && isValidKeyPress(event)) {
				end(event);
				document.removeEventListener("keyup", keyupHandler);
				var role = target.getAttribute("role");
				var elementType = getElementType(target);
				var isNativeInteractiveElement = role === "link" || elementType === "a" || elementType === "button" || elementType === "input" || elementType === "select" || elementType === "textarea";
				var isActiveElement = this._responderElement === target;
				if (onPress != null && !isNativeInteractiveElement && isActiveElement) onPress(event);
				this._responderElement = null;
			}
		};
		return {
			onStartShouldSetResponder: (event) => {
				var disabled = this._config.disabled;
				if (disabled && isButtonRole(event.currentTarget)) event.stopPropagation();
				if (disabled == null) return true;
				return !disabled;
			},
			onKeyDown: (event) => {
				var disabled = this._config.disabled;
				var key = event.key, target = event.target;
				if (!disabled && isValidKeyPress(event)) {
					if (this._touchState === NOT_RESPONDER) {
						start(event, false);
						this._responderElement = target;
						document.addEventListener("keyup", keyupHandler);
					}
					var isSpacebarKey = key === " " || key === "Spacebar";
					var role = getElementRole(target);
					if (isSpacebarKey && (role === "button" || role === "menuitem") && getElementType(target) !== "button") event.preventDefault();
					event.stopPropagation();
				}
			},
			onResponderGrant: (event) => start(event),
			onResponderMove: (event) => {
				if (this._config.onPressMove != null) this._config.onPressMove(event);
				var touch = getTouchFromResponderEvent(event);
				if (this._touchActivatePosition != null) {
					var deltaX = this._touchActivatePosition.pageX - touch.pageX;
					var deltaY = this._touchActivatePosition.pageY - touch.pageY;
					if (Math.hypot(deltaX, deltaY) > 10) this._cancelLongPressDelayTimeout();
				}
			},
			onResponderRelease: (event) => end(event),
			onResponderTerminate: (event) => {
				if (event.nativeEvent.type === "selectionchange") this._selectionTerminated = true;
				this._receiveSignal(RESPONDER_TERMINATED, event);
			},
			onResponderTerminationRequest: (event) => {
				var _this$_config = this._config, cancelable = _this$_config.cancelable, disabled = _this$_config.disabled, onLongPress = _this$_config.onLongPress;
				if (!disabled && onLongPress != null && this._isPointerTouch && event.nativeEvent.type === "contextmenu") return false;
				if (cancelable == null) return true;
				return cancelable;
			},
			onClick: (event) => {
				var _this$_config2 = this._config, disabled = _this$_config2.disabled, onPress = _this$_config2.onPress;
				if (!disabled) {
					event.stopPropagation();
					if (this._longPressDispatched || this._selectionTerminated) event.preventDefault();
					else if (onPress != null && event.altKey === false) onPress(event);
				} else if (isButtonRole(event.currentTarget)) event.stopPropagation();
			},
			onContextMenu: (event) => {
				var _this$_config3 = this._config, disabled = _this$_config3.disabled, onLongPress = _this$_config3.onLongPress;
				if (!disabled) {
					if (onLongPress != null && this._isPointerTouch && !event.defaultPrevented) {
						event.preventDefault();
						event.stopPropagation();
					}
				} else if (isButtonRole(event.currentTarget)) event.stopPropagation();
			}
		};
	}
	/**
	* Receives a state machine signal, performs side effects of the transition
	* and stores the new state. Validates the transition as well.
	*/
	_receiveSignal(signal, event) {
		var prevState = this._touchState;
		var nextState = null;
		if (Transitions$1[prevState] != null) nextState = Transitions$1[prevState][signal];
		if (this._touchState === NOT_RESPONDER && signal === RESPONDER_RELEASE) return;
		if (nextState == null || nextState === ERROR) console.error("PressResponder: Invalid signal " + signal + " for state " + prevState + " on responder");
		else if (prevState !== nextState) {
			this._performTransitionSideEffects(prevState, nextState, signal, event);
			this._touchState = nextState;
		}
	}
	/**
	* Performs a transition between touchable states and identify any activations
	* or deactivations (and callback invocations).
	*/
	_performTransitionSideEffects(prevState, nextState, signal, event) {
		if (isTerminalSignal(signal)) {
			setTimeout(() => {
				this._isPointerTouch = false;
			}, 0);
			this._touchActivatePosition = null;
			this._cancelLongPressDelayTimeout();
		}
		if (isPressStartSignal(prevState) && signal === LONG_PRESS_DETECTED) {
			var onLongPress = this._config.onLongPress;
			if (onLongPress != null && event.nativeEvent.key == null) {
				onLongPress(event);
				this._longPressDispatched = true;
			}
		}
		var isPrevActive = isActiveSignal(prevState);
		var isNextActive = isActiveSignal(nextState);
		if (!isPrevActive && isNextActive) this._activate(event);
		else if (isPrevActive && !isNextActive) this._deactivate(event);
		if (isPressStartSignal(prevState) && signal === RESPONDER_RELEASE) {
			var _this$_config4 = this._config, _onLongPress = _this$_config4.onLongPress;
			if (_this$_config4.onPress != null) {
				if (!(_onLongPress != null && prevState === RESPONDER_ACTIVE_LONG_PRESS_START)) {
					if (!isNextActive && !isPrevActive) {
						this._activate(event);
						this._deactivate(event);
					}
				}
			}
		}
		this._cancelPressDelayTimeout();
	}
	_activate(event) {
		var _this$_config5 = this._config, onPressChange = _this$_config5.onPressChange, onPressStart = _this$_config5.onPressStart;
		var touch = getTouchFromResponderEvent(event);
		this._touchActivatePosition = {
			pageX: touch.pageX,
			pageY: touch.pageY
		};
		if (onPressStart != null) onPressStart(event);
		if (onPressChange != null) onPressChange(true);
	}
	_deactivate(event) {
		var _this$_config6 = this._config, onPressChange = _this$_config6.onPressChange, onPressEnd = _this$_config6.onPressEnd;
		function end() {
			if (onPressEnd != null) onPressEnd(event);
			if (onPressChange != null) onPressChange(false);
		}
		var delayPressEnd = normalizeDelay(this._config.delayPressEnd);
		if (delayPressEnd > 0) this._pressOutDelayTimeout = setTimeout(() => {
			end();
		}, delayPressEnd);
		else end();
	}
	_handleLongPress(event) {
		if (this._touchState === RESPONDER_ACTIVE_PRESS_START || this._touchState === RESPONDER_ACTIVE_LONG_PRESS_START) this._receiveSignal(LONG_PRESS_DETECTED, event);
	}
	_cancelLongPressDelayTimeout() {
		if (this._longPressDelayTimeout != null) {
			clearTimeout(this._longPressDelayTimeout);
			this._longPressDelayTimeout = null;
		}
	}
	_cancelPressDelayTimeout() {
		if (this._pressDelayTimeout != null) {
			clearTimeout(this._pressDelayTimeout);
			this._pressDelayTimeout = null;
		}
	}
	_cancelPressOutDelayTimeout() {
		if (this._pressOutDelayTimeout != null) {
			clearTimeout(this._pressOutDelayTimeout);
			this._pressOutDelayTimeout = null;
		}
	}
};
function normalizeDelay(delay, min, fallback) {
	if (min === void 0) min = 0;
	if (fallback === void 0) fallback = 0;
	return Math.max(min, delay !== null && delay !== void 0 ? delay : fallback);
}
function getTouchFromResponderEvent(event) {
	var _event$nativeEvent = event.nativeEvent, changedTouches = _event$nativeEvent.changedTouches, touches = _event$nativeEvent.touches;
	if (touches != null && touches.length > 0) return touches[0];
	if (changedTouches != null && changedTouches.length > 0) return changedTouches[0];
	return event.nativeEvent;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/usePressEvents/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
function usePressEvents(hostRef, config) {
	var pressResponderRef = (0, import_react.useRef)(null);
	if (pressResponderRef.current == null) pressResponderRef.current = new PressResponder(config);
	var pressResponder = pressResponderRef.current;
	(0, import_react.useEffect)(() => {
		pressResponder.configure(config);
	}, [config, pressResponder]);
	(0, import_react.useEffect)(() => {
		return () => {
			pressResponder.reset();
		};
	}, [pressResponder]);
	(0, import_react.useDebugValue)(config);
	return pressResponder.getEventHandlers();
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/TouchableOpacity/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$12 = [
	"activeOpacity",
	"delayPressIn",
	"delayPressOut",
	"delayLongPress",
	"disabled",
	"focusable",
	"onLongPress",
	"onPress",
	"onPressIn",
	"onPressOut",
	"rejectResponderTermination",
	"style"
];
/**
* A wrapper for making views respond properly to touches.
* On press down, the opacity of the wrapped view is decreased, dimming it.
*/
function TouchableOpacity(props, forwardedRef) {
	var activeOpacity = props.activeOpacity, delayPressIn = props.delayPressIn, delayPressOut = props.delayPressOut, delayLongPress = props.delayLongPress, disabled = props.disabled, focusable = props.focusable, onLongPress = props.onLongPress, onPress = props.onPress, onPressIn = props.onPressIn, onPressOut = props.onPressOut, rejectResponderTermination = props.rejectResponderTermination, style = props.style, rest = _objectWithoutPropertiesLoose(props, _excluded$12);
	var hostRef = (0, import_react.useRef)(null);
	var setRef = useMergeRefs$1(forwardedRef, hostRef);
	var _useState = (0, import_react.useState)("0s"), duration = _useState[0], setDuration = _useState[1];
	var _useState2 = (0, import_react.useState)(null), opacityOverride = _useState2[0], setOpacityOverride = _useState2[1];
	var setOpacityTo = (0, import_react.useCallback)((value, duration) => {
		setOpacityOverride(value);
		setDuration(duration ? duration / 1e3 + "s" : "0s");
	}, [setOpacityOverride, setDuration]);
	var setOpacityActive = (0, import_react.useCallback)((duration) => {
		setOpacityTo(activeOpacity !== null && activeOpacity !== void 0 ? activeOpacity : .2, duration);
	}, [activeOpacity, setOpacityTo]);
	var setOpacityInactive = (0, import_react.useCallback)((duration) => {
		setOpacityTo(null, duration);
	}, [setOpacityTo]);
	var pressEventHandlers = usePressEvents(hostRef, (0, import_react.useMemo)(() => ({
		cancelable: !rejectResponderTermination,
		disabled,
		delayLongPress,
		delayPressStart: delayPressIn,
		delayPressEnd: delayPressOut,
		onLongPress,
		onPress,
		onPressStart(event) {
			setOpacityActive((event.dispatchConfig != null ? event.dispatchConfig.registrationName === "onResponderGrant" : event.type === "keydown") ? 0 : 150);
			if (onPressIn != null) onPressIn(event);
		},
		onPressEnd(event) {
			setOpacityInactive(250);
			if (onPressOut != null) onPressOut(event);
		}
	}), [
		delayLongPress,
		delayPressIn,
		delayPressOut,
		disabled,
		onLongPress,
		onPress,
		onPressIn,
		onPressOut,
		rejectResponderTermination,
		setOpacityActive,
		setOpacityInactive
	]));
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, pressEventHandlers, {
		accessibilityDisabled: disabled,
		focusable: !disabled && focusable !== false,
		pointerEvents: disabled ? "box-none" : void 0,
		ref: setRef,
		style: [
			styles$12.root,
			!disabled && styles$12.actionable,
			style,
			opacityOverride != null && { opacity: opacityOverride },
			{ transitionDuration: duration }
		]
	}));
}
var styles$12 = stylesheet.create({
	root: {
		transitionProperty: "opacity",
		transitionDuration: "0.15s",
		userSelect: "none"
	},
	actionable: {
		cursor: "pointer",
		touchAction: "manipulation"
	}
});
var MemoedTouchableOpacity = /*#__PURE__*/ import_react.memo(/*#__PURE__*/ import_react.forwardRef(TouchableOpacity));
MemoedTouchableOpacity.displayName = "TouchableOpacity";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Button/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var Button = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var accessibilityLabel = props.accessibilityLabel, color = props.color, disabled = props.disabled, onPress = props.onPress, testID = props.testID, title = props.title;
	return /*#__PURE__*/ import_react.createElement(MemoedTouchableOpacity, {
		accessibilityLabel,
		accessibilityRole: "button",
		disabled,
		focusable: !disabled,
		onPress,
		ref: forwardedRef,
		style: [
			styles$11.button,
			color && { backgroundColor: color },
			disabled && styles$11.buttonDisabled
		],
		testID
	}, /*#__PURE__*/ import_react.createElement(Text, { style: [styles$11.text, disabled && styles$11.textDisabled] }, title));
});
Button.displayName = "Button";
var styles$11 = stylesheet.create({
	button: {
		backgroundColor: "#2196F3",
		borderRadius: 2
	},
	text: {
		color: "#fff",
		fontWeight: "500",
		padding: 8,
		textAlign: "center",
		textTransform: "uppercase"
	},
	buttonDisabled: { backgroundColor: "#dfdfdf" },
	textDisabled: { color: "#a1a1a1" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/CheckBox/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$11 = [
	"aria-readonly",
	"color",
	"disabled",
	"onChange",
	"onValueChange",
	"readOnly",
	"style",
	"value"
];
var CheckBox = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var ariaReadOnly = props["aria-readonly"], color = props.color, disabled = props.disabled, onChange = props.onChange, onValueChange = props.onValueChange, readOnly = props.readOnly, style = props.style, value = props.value, other = _objectWithoutPropertiesLoose(props, _excluded$11);
	function handleChange(event) {
		var value = event.nativeEvent.target.checked;
		event.nativeEvent.value = value;
		onChange && onChange(event);
		onValueChange && onValueChange(value);
	}
	var fakeControl = /*#__PURE__*/ import_react.createElement(View, { style: [
		styles$10.fakeControl,
		value && styles$10.fakeControlChecked,
		value && color && {
			backgroundColor: color,
			borderColor: color
		},
		disabled && styles$10.fakeControlDisabled,
		value && disabled && styles$10.fakeControlCheckedAndDisabled
	] });
	var nativeControl = createElement("input", {
		checked: value,
		disabled,
		onChange: handleChange,
		readOnly: readOnly === true || ariaReadOnly === true || other.accessibilityReadOnly === true,
		ref: forwardedRef,
		style: [styles$10.nativeControl, styles$10.cursorInherit],
		type: "checkbox"
	});
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, other, {
		"aria-disabled": disabled,
		"aria-readonly": ariaReadOnly,
		style: [
			styles$10.root,
			style,
			disabled && styles$10.cursorDefault
		]
	}), fakeControl, nativeControl);
});
CheckBox.displayName = "CheckBox";
var styles$10 = stylesheet.create({
	root: {
		cursor: "pointer",
		height: 16,
		userSelect: "none",
		width: 16
	},
	cursorDefault: { cursor: "default" },
	cursorInherit: { cursor: "inherit" },
	fakeControl: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderColor: "#657786",
		borderRadius: 2,
		borderStyle: "solid",
		borderWidth: 2,
		height: "100%",
		justifyContent: "center",
		width: "100%"
	},
	fakeControlChecked: {
		backgroundColor: "#009688",
		backgroundImage: "url(\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgdmVyc2lvbj0iMS4xIgogICB2aWV3Qm94PSIwIDAgMSAxIgogICBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWluWU1pbiBtZWV0Ij4KICA8cGF0aAogICAgIGQ9Ik0gMC4wNDAzODA1OSwwLjYyNjc3NjcgMC4xNDY0NDY2MSwwLjUyMDcxMDY4IDAuNDI5Mjg5MzIsMC44MDM1NTMzOSAwLjMyMzIyMzMsMC45MDk2MTk0MSB6IE0gMC4yMTcxNTcyOSwwLjgwMzU1MzM5IDAuODUzNTUzMzksMC4xNjcxNTcyOSAwLjk1OTYxOTQxLDAuMjczMjIzMyAwLjMyMzIyMzMsMC45MDk2MTk0MSB6IgogICAgIGlkPSJyZWN0Mzc4MCIKICAgICBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lIiAvPgo8L3N2Zz4K\")",
		backgroundRepeat: "no-repeat",
		borderColor: "#009688"
	},
	fakeControlDisabled: { borderColor: "#CCD6DD" },
	fakeControlCheckedAndDisabled: {
		backgroundColor: "#AAB8C2",
		borderColor: "#AAB8C2"
	},
	nativeControl: _objectSpread2(_objectSpread2({}, stylesheet.absoluteFillObject), {}, {
		height: "100%",
		margin: 0,
		appearance: "none",
		padding: 0,
		width: "100%"
	})
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/ImageBackground/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$10 = [
	"children",
	"style",
	"imageStyle",
	"imageRef"
];
var emptyObject$2 = {};
/**
* Very simple drop-in replacement for <Image> which supports nesting views.
*/
var ImageBackground = /*#__PURE__*/ (0, import_react.forwardRef)((props, forwardedRef) => {
	var children = props.children, _props$style = props.style, style = _props$style === void 0 ? emptyObject$2 : _props$style, imageStyle = props.imageStyle, imageRef = props.imageRef, rest = _objectWithoutPropertiesLoose(props, _excluded$10);
	var _StyleSheet$flatten = stylesheet.flatten(style), height = _StyleSheet$flatten.height, width = _StyleSheet$flatten.width;
	return /*#__PURE__*/ import_react.createElement(View, {
		ref: forwardedRef,
		style
	}, /*#__PURE__*/ import_react.createElement(ImageWithStatics, _extends({}, rest, {
		ref: imageRef,
		style: [
			{
				width,
				height,
				zIndex: -1
			},
			stylesheet.absoluteFill,
			imageStyle
		]
	})), children);
});
ImageBackground.displayName = "ImageBackground";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/KeyboardAvoidingView/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$9 = [
	"behavior",
	"contentContainerStyle",
	"keyboardVerticalOffset"
];
var KeyboardAvoidingView = class extends import_react.Component {
	constructor() {
		super(...arguments);
		this.frame = null;
		this.onLayout = (event) => {
			this.frame = event.nativeEvent.layout;
		};
	}
	relativeKeyboardHeight(keyboardFrame) {
		var frame = this.frame;
		if (!frame || !keyboardFrame) return 0;
		var keyboardY = keyboardFrame.screenY - (this.props.keyboardVerticalOffset || 0);
		return Math.max(frame.y + frame.height - keyboardY, 0);
	}
	onKeyboardChange(event) {}
	render() {
		var _this$props = this.props;
		_this$props.behavior;
		_this$props.contentContainerStyle;
		_this$props.keyboardVerticalOffset;
		var rest = _objectWithoutPropertiesLoose(_this$props, _excluded$9);
		return /*#__PURE__*/ import_react.createElement(View, _extends({ onLayout: this.onLayout }, rest));
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Modal/ModalPortal.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var import_react_dom = require_react_dom();
function ModalPortal(props) {
	var children = props.children;
	var elementRef = import_react.useRef(null);
	if (canUseDOM && !elementRef.current) {
		var element = document.createElement("div");
		if (element && document.body) {
			document.body.appendChild(element);
			elementRef.current = element;
		}
	}
	import_react.useEffect(() => {
		if (canUseDOM) return () => {
			if (document.body && elementRef.current) {
				document.body.removeChild(elementRef.current);
				elementRef.current = null;
			}
		};
	}, []);
	return elementRef.current && canUseDOM ? /*#__PURE__*/ (0, import_react_dom.createPortal)(children, elementRef.current) : null;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Modal/ModalAnimation.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var ANIMATION_DURATION = 250;
function getAnimationStyle(animationType, visible) {
	if (animationType === "slide") return visible ? animatedSlideInStyles : animatedSlideOutStyles;
	if (animationType === "fade") return visible ? animatedFadeInStyles : animatedFadeOutStyles;
	return visible ? styles$9.container : styles$9.hidden;
}
function ModalAnimation(props) {
	var animationType = props.animationType, children = props.children, onDismiss = props.onDismiss, onShow = props.onShow, visible = props.visible;
	var _React$useState = import_react.useState(false), isRendering = _React$useState[0], setIsRendering = _React$useState[1];
	var wasVisible = import_react.useRef(false);
	var wasRendering = import_react.useRef(false);
	var isAnimated = animationType && animationType !== "none";
	var animationEndCallback = import_react.useCallback((e) => {
		if (e && e.currentTarget !== e.target) return;
		if (visible) {
			if (onShow) onShow();
		} else setIsRendering(false);
	}, [onShow, visible]);
	import_react.useEffect(() => {
		if (wasRendering.current && !isRendering && onDismiss) onDismiss();
		wasRendering.current = isRendering;
	}, [isRendering, onDismiss]);
	import_react.useEffect(() => {
		if (visible) setIsRendering(true);
		if (visible !== wasVisible.current && !isAnimated) animationEndCallback();
		wasVisible.current = visible;
	}, [
		isAnimated,
		visible,
		animationEndCallback
	]);
	return isRendering || visible ? createElement("div", {
		style: isRendering ? getAnimationStyle(animationType, visible) : styles$9.hidden,
		onAnimationEnd: animationEndCallback,
		children
	}) : null;
}
var styles$9 = stylesheet.create({
	container: {
		position: "fixed",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 9999
	},
	animatedIn: {
		animationDuration: ANIMATION_DURATION + "ms",
		animationTimingFunction: "cubic-bezier(0.215, 0.61, 0.355, 1)"
	},
	animatedOut: {
		pointerEvents: "none",
		animationDuration: ANIMATION_DURATION + "ms",
		animationTimingFunction: "cubic-bezier(0.47, 0, 0.745, 0.715)"
	},
	fadeIn: {
		opacity: 1,
		animationKeyframes: {
			"0%": { opacity: 0 },
			"100%": { opacity: 1 }
		}
	},
	fadeOut: {
		opacity: 0,
		animationKeyframes: {
			"0%": { opacity: 1 },
			"100%": { opacity: 0 }
		}
	},
	slideIn: {
		transform: "translateY(0%)",
		animationKeyframes: {
			"0%": { transform: "translateY(100%)" },
			"100%": { transform: "translateY(0%)" }
		}
	},
	slideOut: {
		transform: "translateY(100%)",
		animationKeyframes: {
			"0%": { transform: "translateY(0%)" },
			"100%": { transform: "translateY(100%)" }
		}
	},
	hidden: { opacity: 0 }
});
var animatedSlideInStyles = [
	styles$9.container,
	styles$9.animatedIn,
	styles$9.slideIn
];
var animatedSlideOutStyles = [
	styles$9.container,
	styles$9.animatedOut,
	styles$9.slideOut
];
var animatedFadeInStyles = [
	styles$9.container,
	styles$9.animatedIn,
	styles$9.fadeIn
];
var animatedFadeOutStyles = [
	styles$9.container,
	styles$9.animatedOut,
	styles$9.fadeOut
];
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Modal/ModalContent.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$8 = [
	"active",
	"children",
	"onRequestClose",
	"transparent"
];
var ModalContent = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var active = props.active, children = props.children, onRequestClose = props.onRequestClose, transparent = props.transparent, rest = _objectWithoutPropertiesLoose(props, _excluded$8);
	import_react.useEffect(() => {
		if (canUseDOM) {
			var closeOnEscape = (e) => {
				if (active && e.key === "Escape") {
					e.stopPropagation();
					if (onRequestClose) onRequestClose();
				}
			};
			document.addEventListener("keyup", closeOnEscape, false);
			return () => document.removeEventListener("keyup", closeOnEscape, false);
		}
	}, [active, onRequestClose]);
	var style = import_react.useMemo(() => {
		return [styles$8.modal, transparent ? styles$8.modalTransparent : styles$8.modalOpaque];
	}, [transparent]);
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, {
		"aria-modal": true,
		ref: forwardedRef,
		role: active ? "dialog" : null,
		style
	}), /*#__PURE__*/ import_react.createElement(View, { style: styles$8.container }, children));
});
var styles$8 = stylesheet.create({
	modal: {
		position: "fixed",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	},
	modalTransparent: { backgroundColor: "transparent" },
	modalOpaque: { backgroundColor: "white" },
	container: {
		top: 0,
		flex: 1
	}
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Modal/ModalFocusTrap.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* This Component is used to "wrap" the modal we're opening
* so that changing focus via tab will never leave the document.
*
* This allows us to properly trap the focus within a modal
* even if the modal is at the start or end of a document.
*/
var FocusBracket = () => {
	return createElement("div", {
		role: "none",
		tabIndex: 0,
		style: styles$7.focusBracket
	});
};
function attemptFocus(element) {
	if (!canUseDOM) return false;
	try {
		element.focus();
	} catch (e) {}
	return document.activeElement === element;
}
function focusFirstDescendant(element) {
	for (var i = 0; i < element.childNodes.length; i++) {
		var child = element.childNodes[i];
		if (attemptFocus(child) || focusFirstDescendant(child)) return true;
	}
	return false;
}
function focusLastDescendant(element) {
	for (var i = element.childNodes.length - 1; i >= 0; i--) {
		var child = element.childNodes[i];
		if (attemptFocus(child) || focusLastDescendant(child)) return true;
	}
	return false;
}
var ModalFocusTrap = (_ref) => {
	var active = _ref.active, children = _ref.children;
	var trapElementRef = import_react.useRef();
	var focusRef = import_react.useRef({
		trapFocusInProgress: false,
		lastFocusedElement: null
	});
	import_react.useEffect(() => {
		if (canUseDOM) {
			var trapFocus = () => {
				if (trapElementRef.current == null || focusRef.current.trapFocusInProgress || !active) return;
				try {
					focusRef.current.trapFocusInProgress = true;
					if (document.activeElement instanceof Node && !trapElementRef.current.contains(document.activeElement)) {
						var hasFocused = focusFirstDescendant(trapElementRef.current);
						if (focusRef.current.lastFocusedElement === document.activeElement) hasFocused = focusLastDescendant(trapElementRef.current);
						if (!hasFocused && trapElementRef.current != null && document.activeElement) UIManager.focus(trapElementRef.current);
					}
				} finally {
					focusRef.current.trapFocusInProgress = false;
				}
				focusRef.current.lastFocusedElement = document.activeElement;
			};
			trapFocus();
			document.addEventListener("focus", trapFocus, true);
			return () => document.removeEventListener("focus", trapFocus, true);
		}
	}, [active]);
	import_react.useEffect(function() {
		if (canUseDOM) {
			var lastFocusedElementOutsideTrap = document.activeElement;
			return function() {
				if (lastFocusedElementOutsideTrap && document.contains(lastFocusedElementOutsideTrap)) UIManager.focus(lastFocusedElementOutsideTrap);
			};
		}
	}, []);
	return /*#__PURE__*/ import_react.createElement(import_react.Fragment, null, /*#__PURE__*/ import_react.createElement(FocusBracket, null), /*#__PURE__*/ import_react.createElement(View, { ref: trapElementRef }, children), /*#__PURE__*/ import_react.createElement(FocusBracket, null));
};
var styles$7 = stylesheet.create({ focusBracket: { outlineStyle: "none" } });
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Modal/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$7 = [
	"animationType",
	"children",
	"onDismiss",
	"onRequestClose",
	"onShow",
	"transparent",
	"visible"
];
var uniqueModalIdentifier = 0;
var activeModalStack = [];
var activeModalListeners = {};
function notifyActiveModalListeners() {
	if (activeModalStack.length === 0) return;
	var activeModalId = activeModalStack[activeModalStack.length - 1];
	activeModalStack.forEach((modalId) => {
		if (modalId in activeModalListeners) activeModalListeners[modalId](modalId === activeModalId);
	});
}
function removeActiveModal(modalId) {
	if (modalId in activeModalListeners) {
		activeModalListeners[modalId](false);
		delete activeModalListeners[modalId];
	}
	var index = activeModalStack.indexOf(modalId);
	if (index !== -1) {
		activeModalStack.splice(index, 1);
		notifyActiveModalListeners();
	}
}
function addActiveModal(modalId, listener) {
	removeActiveModal(modalId);
	activeModalStack.push(modalId);
	activeModalListeners[modalId] = listener;
	notifyActiveModalListeners();
}
var Modal = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var animationType = props.animationType, children = props.children, onDismiss = props.onDismiss, onRequestClose = props.onRequestClose, onShow = props.onShow, transparent = props.transparent, _props$visible = props.visible, visible = _props$visible === void 0 ? true : _props$visible, rest = _objectWithoutPropertiesLoose(props, _excluded$7);
	var modalId = import_react.useMemo(() => uniqueModalIdentifier++, []);
	var _React$useState = import_react.useState(false), isActive = _React$useState[0], setIsActive = _React$useState[1];
	var onDismissCallback = import_react.useCallback(() => {
		removeActiveModal(modalId);
		if (onDismiss) onDismiss();
	}, [modalId, onDismiss]);
	var onShowCallback = import_react.useCallback(() => {
		addActiveModal(modalId, setIsActive);
		if (onShow) onShow();
	}, [modalId, onShow]);
	import_react.useEffect(() => {
		return () => removeActiveModal(modalId);
	}, [modalId]);
	return /*#__PURE__*/ import_react.createElement(ModalPortal, null, /*#__PURE__*/ import_react.createElement(ModalAnimation, {
		animationType,
		onDismiss: onDismissCallback,
		onShow: onShowCallback,
		visible
	}, /*#__PURE__*/ import_react.createElement(ModalFocusTrap, { active: isActive }, /*#__PURE__*/ import_react.createElement(ModalContent, _extends({}, rest, {
		active: isActive,
		onRequestClose,
		ref: forwardedRef,
		transparent
	}), children))));
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Picker/PickerItem.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function PickerItem(props) {
	var color = props.color, label = props.label, testID = props.testID, value = props.value;
	return createElement("option", {
		children: label,
		style: { color },
		testID,
		value
	});
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Picker/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$6 = [
	"children",
	"enabled",
	"onValueChange",
	"selectedValue",
	"style",
	"testID",
	"itemStyle",
	"mode",
	"prompt"
];
var Picker = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var children = props.children, enabled = props.enabled, onValueChange = props.onValueChange, selectedValue = props.selectedValue, style = props.style, testID = props.testID;
	props.itemStyle;
	props.mode;
	props.prompt;
	var other = _objectWithoutPropertiesLoose(props, _excluded$6);
	var hostRef = import_react.useRef(null);
	function handleChange(e) {
		var _e$target = e.target, selectedIndex = _e$target.selectedIndex, value = _e$target.value;
		if (onValueChange) onValueChange(value, selectedIndex);
	}
	var supportedProps = _objectSpread2({
		children,
		disabled: enabled === false ? true : void 0,
		onChange: handleChange,
		style: [styles$6.initial, style],
		testID,
		value: selectedValue
	}, other);
	supportedProps.ref = useMergeRefs$1(hostRef, usePlatformMethods(supportedProps), forwardedRef);
	return createElement("select", supportedProps);
});
Picker.Item = PickerItem;
var styles$6 = stylesheet.create({ initial: {
	fontFamily: "System",
	fontSize: "inherit",
	margin: 0
} });
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/addEventListener/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var emptyFunction$1 = () => {};
function supportsPassiveEvents() {
	var supported = false;
	if (canUseDOM) try {
		var options = {};
		Object.defineProperty(options, "passive", { get() {
			supported = true;
			return false;
		} });
		window.addEventListener("test", null, options);
		window.removeEventListener("test", null, options);
	} catch (e) {}
	return supported;
}
var canUsePassiveEvents = supportsPassiveEvents();
function getOptions(options) {
	if (options == null) return false;
	return canUsePassiveEvents ? options : Boolean(options.capture);
}
/**
* Shim generic API compatibility with ReactDOM's synthetic events, without needing the
* large amount of code ReactDOM uses to do this. Ideally we wouldn't use a synthetic
* event wrapper at all.
*/
function isPropagationStopped() {
	return this.cancelBubble;
}
function isDefaultPrevented() {
	return this.defaultPrevented;
}
function normalizeEvent(event) {
	event.nativeEvent = event;
	event.persist = emptyFunction$1;
	event.isDefaultPrevented = isDefaultPrevented;
	event.isPropagationStopped = isPropagationStopped;
	return event;
}
/**
*
*/
function addEventListener(target, type, listener, options) {
	var opts = getOptions(options);
	var compatListener = (e) => listener(normalizeEvent(e));
	target.addEventListener(type, compatListener, opts);
	return function removeEventListener() {
		if (target != null) target.removeEventListener(type, compatListener, opts);
	};
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/modality/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var supportsPointerEvent$1 = () => !!(typeof window !== "undefined" && window.PointerEvent != null);
var activeModality = "keyboard";
var modality = "keyboard";
var previousModality;
var previousActiveModality;
var isEmulatingMouseEvents = false;
var listeners = /* @__PURE__ */ new Set();
var KEYBOARD = "keyboard";
var MOUSE = "mouse";
var TOUCH = "touch";
var BLUR = "blur";
var CONTEXTMENU = "contextmenu";
var FOCUS = "focus";
var KEYDOWN = "keydown";
var MOUSEDOWN = "mousedown";
var MOUSEMOVE = "mousemove";
var MOUSEUP = "mouseup";
var POINTERDOWN = "pointerdown";
var POINTERMOVE = "pointermove";
var SCROLL = "scroll";
var SELECTIONCHANGE = "selectionchange";
var TOUCHCANCEL = "touchcancel";
var TOUCHMOVE = "touchmove";
var TOUCHSTART = "touchstart";
var VISIBILITYCHANGE = "visibilitychange";
var bubbleOptions = { passive: true };
var captureOptions = {
	capture: true,
	passive: true
};
function restoreModality() {
	if (previousModality != null || previousActiveModality != null) {
		if (previousModality != null) {
			modality = previousModality;
			previousModality = null;
		}
		if (previousActiveModality != null) {
			activeModality = previousActiveModality;
			previousActiveModality = null;
		}
		callListeners();
	}
}
function onBlurWindow() {
	previousModality = modality;
	previousActiveModality = activeModality;
	activeModality = KEYBOARD;
	modality = KEYBOARD;
	callListeners();
	isEmulatingMouseEvents = false;
}
function onFocusWindow() {
	restoreModality();
}
function onKeyDown(event) {
	if (event.metaKey || event.altKey || event.ctrlKey) return;
	if (modality !== KEYBOARD) {
		modality = KEYBOARD;
		activeModality = KEYBOARD;
		callListeners();
	}
}
function onVisibilityChange() {
	if (document.visibilityState !== "hidden") restoreModality();
}
function onPointerish(event) {
	var eventType = event.type;
	if (supportsPointerEvent$1()) {
		if (eventType === POINTERDOWN) {
			if (activeModality !== event.pointerType) {
				modality = event.pointerType;
				activeModality = event.pointerType;
				callListeners();
			}
			return;
		}
		if (eventType === POINTERMOVE) {
			if (modality !== event.pointerType) {
				modality = event.pointerType;
				callListeners();
			}
			return;
		}
	} else {
		if (!isEmulatingMouseEvents) {
			if (eventType === MOUSEDOWN) {
				if (activeModality !== MOUSE) {
					modality = MOUSE;
					activeModality = MOUSE;
					callListeners();
				}
			}
			if (eventType === MOUSEMOVE) {
				if (modality !== MOUSE) {
					modality = MOUSE;
					callListeners();
				}
			}
		}
		if (eventType === TOUCHSTART) {
			isEmulatingMouseEvents = true;
			if (event.touches && event.touches.length > 1) isEmulatingMouseEvents = false;
			if (activeModality !== TOUCH) {
				modality = TOUCH;
				activeModality = TOUCH;
				callListeners();
			}
			return;
		}
		if (eventType === CONTEXTMENU || eventType === MOUSEUP || eventType === SELECTIONCHANGE || eventType === SCROLL || eventType === TOUCHCANCEL || eventType === TOUCHMOVE) isEmulatingMouseEvents = false;
	}
}
if (canUseDOM) {
	addEventListener(window, BLUR, onBlurWindow, bubbleOptions);
	addEventListener(window, FOCUS, onFocusWindow, bubbleOptions);
	addEventListener(document, KEYDOWN, onKeyDown, captureOptions);
	addEventListener(document, VISIBILITYCHANGE, onVisibilityChange, captureOptions);
	addEventListener(document, POINTERDOWN, onPointerish, captureOptions);
	addEventListener(document, POINTERMOVE, onPointerish, captureOptions);
	addEventListener(document, CONTEXTMENU, onPointerish, captureOptions);
	addEventListener(document, MOUSEDOWN, onPointerish, captureOptions);
	addEventListener(document, MOUSEMOVE, onPointerish, captureOptions);
	addEventListener(document, MOUSEUP, onPointerish, captureOptions);
	addEventListener(document, TOUCHCANCEL, onPointerish, captureOptions);
	addEventListener(document, TOUCHMOVE, onPointerish, captureOptions);
	addEventListener(document, TOUCHSTART, onPointerish, captureOptions);
	addEventListener(document, SELECTIONCHANGE, onPointerish, captureOptions);
	addEventListener(document, SCROLL, onPointerish, captureOptions);
}
function callListeners() {
	var value = {
		activeModality,
		modality
	};
	listeners.forEach((listener) => {
		listener(value);
	});
}
function getModality() {
	return modality;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useEvent/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* This can be used with any event type include custom events.
*
* const click = useEvent('click', options);
* useEffect(() => {
*   click.setListener(target, onClick);
*   return () => click.clear();
* }).
*/
function useEvent(eventType, options) {
	var targetListeners = useStable$1(() => /* @__PURE__ */ new Map());
	var addListener = useStable$1(() => {
		return (target, callback) => {
			var removeTargetListener = targetListeners.get(target);
			if (removeTargetListener != null) removeTargetListener();
			if (callback == null) {
				targetListeners.delete(target);
				callback = () => {};
			}
			var removeEventListener = addEventListener(target, eventType, callback, options);
			targetListeners.set(target, removeEventListener);
			return removeEventListener;
		};
	});
	useLayoutEffectImpl(() => {
		return () => {
			targetListeners.forEach((removeListener) => {
				removeListener();
			});
			targetListeners.clear();
		};
	}, [targetListeners]);
	return addListener;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/useHover/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* Types
*/
/**
* Implementation
*/
var emptyObject$1 = {};
var opts = { passive: true };
var lockEventType = "react-gui:hover:lock";
var unlockEventType = "react-gui:hover:unlock";
var supportsPointerEvent = () => !!(typeof window !== "undefined" && window.PointerEvent != null);
function dispatchCustomEvent(target, type, payload) {
	var event = document.createEvent("CustomEvent");
	var _ref = payload || emptyObject$1, _ref$bubbles = _ref.bubbles, bubbles = _ref$bubbles === void 0 ? true : _ref$bubbles, _ref$cancelable = _ref.cancelable, cancelable = _ref$cancelable === void 0 ? true : _ref$cancelable, detail = _ref.detail;
	event.initCustomEvent(type, bubbles, cancelable, detail);
	target.dispatchEvent(event);
}
function getPointerType(event) {
	var pointerType = event.pointerType;
	return pointerType != null ? pointerType : getModality();
}
function useHover(targetRef, config) {
	var contain = config.contain, disabled = config.disabled, onHoverStart = config.onHoverStart, onHoverChange = config.onHoverChange, onHoverUpdate = config.onHoverUpdate, onHoverEnd = config.onHoverEnd;
	var canUsePE = supportsPointerEvent();
	var addMoveListener = useEvent(canUsePE ? "pointermove" : "mousemove", opts);
	var addEnterListener = useEvent(canUsePE ? "pointerenter" : "mouseenter", opts);
	var addLeaveListener = useEvent(canUsePE ? "pointerleave" : "mouseleave", opts);
	var addLockListener = useEvent(lockEventType, opts);
	var addUnlockListener = useEvent(unlockEventType, opts);
	useLayoutEffectImpl(() => {
		var target = targetRef.current;
		if (target !== null) {
			/**
			* End the hover gesture
			*/
			var hoverEnd = function hoverEnd(e) {
				if (onHoverEnd != null) onHoverEnd(e);
				if (onHoverChange != null) onHoverChange(false);
				addMoveListener(target, null);
				addLeaveListener(target, null);
			};
			/**
			* Leave element
			*/
			var leaveListener = function leaveListener(e) {
				var target = targetRef.current;
				if (target != null && getPointerType(e) !== "touch") {
					if (contain) dispatchCustomEvent(target, unlockEventType);
					hoverEnd(e);
				}
			};
			/**
			* Move within element
			*/
			var moveListener = function moveListener(e) {
				if (getPointerType(e) !== "touch") {
					if (onHoverUpdate != null) {
						if (e.x == null) e.x = e.clientX;
						if (e.y == null) e.y = e.clientY;
						onHoverUpdate(e);
					}
				}
			};
			/**
			* Start the hover gesture
			*/
			var hoverStart = function hoverStart(e) {
				if (onHoverStart != null) onHoverStart(e);
				if (onHoverChange != null) onHoverChange(true);
				if (onHoverUpdate != null) addMoveListener(target, !disabled ? moveListener : null);
				addLeaveListener(target, !disabled ? leaveListener : null);
			};
			addEnterListener(target, !disabled ? function enterListener(e) {
				var target = targetRef.current;
				if (target != null && getPointerType(e) !== "touch") {
					if (contain) dispatchCustomEvent(target, lockEventType);
					hoverStart(e);
					var lockListener = function lockListener(lockEvent) {
						if (lockEvent.target !== target) hoverEnd(e);
					};
					var unlockListener = function unlockListener(lockEvent) {
						if (lockEvent.target !== target) hoverStart(e);
					};
					addLockListener(target, !disabled ? lockListener : null);
					addUnlockListener(target, !disabled ? unlockListener : null);
				}
			} : null);
		}
	}, [
		addEnterListener,
		addMoveListener,
		addLeaveListener,
		addLockListener,
		addUnlockListener,
		contain,
		disabled,
		onHoverStart,
		onHoverChange,
		onHoverUpdate,
		onHoverEnd,
		targetRef
	]);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Pressable/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$5 = [
	"children",
	"delayLongPress",
	"delayPressIn",
	"delayPressOut",
	"disabled",
	"onBlur",
	"onContextMenu",
	"onFocus",
	"onHoverIn",
	"onHoverOut",
	"onKeyDown",
	"onLongPress",
	"onPress",
	"onPressMove",
	"onPressIn",
	"onPressOut",
	"style",
	"tabIndex",
	"testOnly_hovered",
	"testOnly_pressed"
];
/**
* Component used to build display components that should respond to whether the
* component is currently pressed or not.
*/
function Pressable(props, forwardedRef) {
	var children = props.children, delayLongPress = props.delayLongPress, delayPressIn = props.delayPressIn, delayPressOut = props.delayPressOut, disabled = props.disabled, onBlur = props.onBlur, onContextMenu = props.onContextMenu, onFocus = props.onFocus, onHoverIn = props.onHoverIn, onHoverOut = props.onHoverOut, onKeyDown = props.onKeyDown, onLongPress = props.onLongPress, onPress = props.onPress, onPressMove = props.onPressMove, onPressIn = props.onPressIn, onPressOut = props.onPressOut, style = props.style, tabIndex = props.tabIndex, testOnly_hovered = props.testOnly_hovered, testOnly_pressed = props.testOnly_pressed, rest = _objectWithoutPropertiesLoose(props, _excluded$5);
	var _useForceableState = useForceableState(testOnly_hovered === true), hovered = _useForceableState[0], setHovered = _useForceableState[1];
	var _useForceableState2 = useForceableState(false), focused = _useForceableState2[0], setFocused = _useForceableState2[1];
	var _useForceableState3 = useForceableState(testOnly_pressed === true), pressed = _useForceableState3[0], setPressed = _useForceableState3[1];
	var hostRef = (0, import_react.useRef)(null);
	var setRef = useMergeRefs$1(forwardedRef, hostRef);
	var pressEventHandlers = usePressEvents(hostRef, (0, import_react.useMemo)(() => ({
		delayLongPress,
		delayPressStart: delayPressIn,
		delayPressEnd: delayPressOut,
		disabled,
		onLongPress,
		onPress,
		onPressChange: setPressed,
		onPressStart: onPressIn,
		onPressMove,
		onPressEnd: onPressOut
	}), [
		delayLongPress,
		delayPressIn,
		delayPressOut,
		disabled,
		onLongPress,
		onPress,
		onPressIn,
		onPressMove,
		onPressOut,
		setPressed
	]));
	var onContextMenuPress = pressEventHandlers.onContextMenu, onKeyDownPress = pressEventHandlers.onKeyDown;
	useHover(hostRef, {
		contain: true,
		disabled,
		onHoverChange: setHovered,
		onHoverStart: onHoverIn,
		onHoverEnd: onHoverOut
	});
	var interactionState = {
		hovered,
		focused,
		pressed
	};
	var blurHandler = import_react.useCallback((e) => {
		if (e.nativeEvent.target === hostRef.current) {
			setFocused(false);
			if (onBlur != null) onBlur(e);
		}
	}, [
		hostRef,
		setFocused,
		onBlur
	]);
	var focusHandler = import_react.useCallback((e) => {
		if (e.nativeEvent.target === hostRef.current) {
			setFocused(true);
			if (onFocus != null) onFocus(e);
		}
	}, [
		hostRef,
		setFocused,
		onFocus
	]);
	var contextMenuHandler = import_react.useCallback((e) => {
		if (onContextMenuPress != null) onContextMenuPress(e);
		if (onContextMenu != null) onContextMenu(e);
	}, [onContextMenu, onContextMenuPress]);
	var keyDownHandler = import_react.useCallback((e) => {
		if (onKeyDownPress != null) onKeyDownPress(e);
		if (onKeyDown != null) onKeyDown(e);
	}, [onKeyDown, onKeyDownPress]);
	var _tabIndex;
	if (tabIndex !== void 0) _tabIndex = tabIndex;
	else _tabIndex = disabled ? -1 : 0;
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, pressEventHandlers, {
		"aria-disabled": disabled,
		onBlur: blurHandler,
		onContextMenu: contextMenuHandler,
		onFocus: focusHandler,
		onKeyDown: keyDownHandler,
		ref: setRef,
		style: [disabled ? styles$5.disabled : styles$5.active, typeof style === "function" ? style(interactionState) : style],
		tabIndex: _tabIndex
	}), typeof children === "function" ? children(interactionState) : children);
}
function useForceableState(forced) {
	var _useState = (0, import_react.useState)(false), bool = _useState[0], setBool = _useState[1];
	return [bool || forced, setBool];
}
var styles$5 = stylesheet.create({
	active: {
		cursor: "pointer",
		touchAction: "manipulation"
	},
	disabled: { pointerEvents: "box-none" }
});
var MemoedPressable = /*#__PURE__*/ (0, import_react.memo)(/*#__PURE__*/ (0, import_react.forwardRef)(Pressable));
MemoedPressable.displayName = "Pressable";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/ProgressBar/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$4 = [
	"color",
	"indeterminate",
	"progress",
	"trackColor",
	"style"
];
var ProgressBar = /*#__PURE__*/ import_react.forwardRef((props, ref) => {
	var _props$color = props.color, color = _props$color === void 0 ? "#1976D2" : _props$color, _props$indeterminate = props.indeterminate, indeterminate = _props$indeterminate === void 0 ? false : _props$indeterminate, _props$progress = props.progress, progress = _props$progress === void 0 ? 0 : _props$progress, _props$trackColor = props.trackColor, trackColor = _props$trackColor === void 0 ? "transparent" : _props$trackColor, style = props.style, other = _objectWithoutPropertiesLoose(props, _excluded$4);
	var percentageProgress = progress * 100;
	var width = indeterminate ? "25%" : percentageProgress + "%";
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, other, {
		"aria-valuemax": 100,
		"aria-valuemin": 0,
		"aria-valuenow": indeterminate ? null : percentageProgress,
		ref,
		role: "progressbar",
		style: [
			styles$4.track,
			style,
			{ backgroundColor: trackColor }
		]
	}), /*#__PURE__*/ import_react.createElement(View, { style: [
		{
			backgroundColor: color,
			width
		},
		styles$4.progress,
		indeterminate && styles$4.animation
	] }));
});
ProgressBar.displayName = "ProgressBar";
var styles$4 = stylesheet.create({
	track: {
		forcedColorAdjust: "none",
		height: 5,
		overflow: "hidden",
		userSelect: "none",
		zIndex: 0
	},
	progress: {
		forcedColorAdjust: "none",
		height: "100%",
		zIndex: -1
	},
	animation: {
		animationDuration: "1s",
		animationKeyframes: [{
			"0%": { transform: "translateX(-100%)" },
			"100%": { transform: "translateX(400%)" }
		}],
		animationTimingFunction: "linear",
		animationIterationCount: "infinite"
	}
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/SafeAreaView/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$3 = ["style"];
var cssFunction = function() {
	if (canUseDOM && window.CSS && window.CSS.supports && window.CSS.supports("top: constant(safe-area-inset-top)")) return "constant";
	return "env";
}();
var SafeAreaView = /*#__PURE__*/ import_react.forwardRef((props, ref) => {
	var style = props.style, rest = _objectWithoutPropertiesLoose(props, _excluded$3);
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, {
		ref,
		style: [styles$3.root, style]
	}));
});
SafeAreaView.displayName = "SafeAreaView";
var styles$3 = stylesheet.create({ root: {
	paddingTop: cssFunction + "(safe-area-inset-top)",
	paddingRight: cssFunction + "(safe-area-inset-right)",
	paddingBottom: cssFunction + "(safe-area-inset-bottom)",
	paddingLeft: cssFunction + "(safe-area-inset-left)"
} });
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/StatusBar/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var emptyFunction = () => {};
function StatusBar() {
	return null;
}
StatusBar.setBackgroundColor = emptyFunction;
StatusBar.setBarStyle = emptyFunction;
StatusBar.setHidden = emptyFunction;
StatusBar.setNetworkActivityIndicatorVisible = emptyFunction;
StatusBar.setTranslucent = emptyFunction;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/multiplyStyleLengthValue/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var CSS_UNIT_RE = /^[+-]?\d*(?:\.\d+)?(?:[Ee][+-]?\d+)?(%|\w*)/;
var getUnit = (str) => str.match(CSS_UNIT_RE)[1];
var isNumeric = (n) => {
	return !isNaN(parseFloat(n)) && isFinite(n);
};
var multiplyStyleLengthValue = (value, multiple) => {
	if (typeof value === "string") {
		var number = parseFloat(value) * multiple;
		var unit = getUnit(value);
		return "" + number + unit;
	} else if (isNumeric(value)) return value * multiple;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Switch/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded$2 = [
	"aria-label",
	"accessibilityLabel",
	"activeThumbColor",
	"activeTrackColor",
	"disabled",
	"onValueChange",
	"style",
	"thumbColor",
	"trackColor",
	"value"
];
var emptyObject = {};
var thumbDefaultBoxShadow = "0px 1px 3px rgba(0,0,0,0.5)";
var thumbFocusedBoxShadow = thumbDefaultBoxShadow + ", 0 0 0 10px rgba(0,0,0,0.1)";
var defaultActiveTrackColor = "#A3D3CF";
var defaultTrackColor = "#939393";
var defaultDisabledTrackColor = "#D5D5D5";
var defaultActiveThumbColor = "#009688";
var defaultThumbColor = "#FAFAFA";
var defaultDisabledThumbColor = "#BDBDBD";
var Switch = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var ariaLabel = props["aria-label"], accessibilityLabel = props.accessibilityLabel, activeThumbColor = props.activeThumbColor, activeTrackColor = props.activeTrackColor, _props$disabled = props.disabled, disabled = _props$disabled === void 0 ? false : _props$disabled, onValueChange = props.onValueChange, _props$style = props.style, style = _props$style === void 0 ? emptyObject : _props$style, thumbColor = props.thumbColor, trackColor = props.trackColor, _props$value = props.value, value = _props$value === void 0 ? false : _props$value, other = _objectWithoutPropertiesLoose(props, _excluded$2);
	var thumbRef = import_react.useRef(null);
	function handleChange(event) {
		if (onValueChange != null) onValueChange(event.nativeEvent.target.checked);
	}
	function handleFocusState(event) {
		var boxShadow = event.nativeEvent.type === "focus" ? thumbFocusedBoxShadow : thumbDefaultBoxShadow;
		if (thumbRef.current != null) thumbRef.current.style.boxShadow = boxShadow;
	}
	var _StyleSheet$flatten = stylesheet.flatten(style), styleHeight = _StyleSheet$flatten.height, styleWidth = _StyleSheet$flatten.width;
	var height = styleHeight || "20px";
	var minWidth = multiplyStyleLengthValue(height, 2);
	var width = styleWidth > minWidth ? styleWidth : minWidth;
	var trackBorderRadius = multiplyStyleLengthValue(height, .5);
	var trackCurrentColor = function() {
		if (value === true) {
			if (trackColor != null && typeof trackColor === "object") return trackColor.true;
			else return activeTrackColor !== null && activeTrackColor !== void 0 ? activeTrackColor : defaultActiveTrackColor;
		} else if (trackColor != null && typeof trackColor === "object") return trackColor.false;
		else return trackColor !== null && trackColor !== void 0 ? trackColor : defaultTrackColor;
	}();
	var thumbCurrentColor = value ? activeThumbColor !== null && activeThumbColor !== void 0 ? activeThumbColor : defaultActiveThumbColor : thumbColor !== null && thumbColor !== void 0 ? thumbColor : defaultThumbColor;
	var thumbHeight = height;
	var thumbWidth = thumbHeight;
	var rootStyle = [
		styles$2.root,
		style,
		disabled && styles$2.cursorDefault,
		{
			height,
			width
		}
	];
	var disabledTrackColor = function() {
		if (value === true) {
			if (typeof activeTrackColor === "string" && activeTrackColor != null || typeof trackColor === "object" && trackColor != null && trackColor.true) return trackCurrentColor;
			else return defaultDisabledTrackColor;
		} else if (typeof trackColor === "string" && trackColor != null || typeof trackColor === "object" && trackColor != null && trackColor.false) return trackCurrentColor;
		else return defaultDisabledTrackColor;
	}();
	var disabledThumbColor = function() {
		if (value === true) {
			if (activeThumbColor == null) return defaultDisabledThumbColor;
			else return thumbCurrentColor;
		} else if (thumbColor == null) return defaultDisabledThumbColor;
		else return thumbCurrentColor;
	}();
	var trackStyle = [styles$2.track, {
		backgroundColor: disabled ? disabledTrackColor : trackCurrentColor,
		borderRadius: trackBorderRadius
	}];
	var thumbStyle = [
		styles$2.thumb,
		value && styles$2.thumbActive,
		{
			backgroundColor: disabled ? disabledThumbColor : thumbCurrentColor,
			height: thumbHeight,
			marginStart: value ? multiplyStyleLengthValue(thumbWidth, -1) : 0,
			width: thumbWidth
		}
	];
	var nativeControl = createElement("input", {
		"aria-label": ariaLabel || accessibilityLabel,
		checked: value,
		disabled,
		onBlur: handleFocusState,
		onChange: handleChange,
		onFocus: handleFocusState,
		ref: forwardedRef,
		style: [styles$2.nativeControl, styles$2.cursorInherit],
		type: "checkbox",
		role: "switch"
	});
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, other, { style: rootStyle }), /*#__PURE__*/ import_react.createElement(View, { style: trackStyle }), /*#__PURE__*/ import_react.createElement(View, {
		ref: thumbRef,
		style: thumbStyle
	}), nativeControl);
});
Switch.displayName = "Switch";
var styles$2 = stylesheet.create({
	root: {
		cursor: "pointer",
		userSelect: "none"
	},
	cursorDefault: { cursor: "default" },
	cursorInherit: { cursor: "inherit" },
	track: _objectSpread2(_objectSpread2({ forcedColorAdjust: "none" }, stylesheet.absoluteFillObject), {}, {
		height: "70%",
		margin: "auto",
		transitionDuration: "0.1s",
		width: "100%"
	}),
	thumb: {
		forcedColorAdjust: "none",
		alignSelf: "flex-start",
		borderRadius: "100%",
		boxShadow: thumbDefaultBoxShadow,
		start: "0%",
		transform: "translateZ(0)",
		transitionDuration: "0.1s"
	},
	thumbActive: { insetInlineStart: "100%" },
	nativeControl: _objectSpread2(_objectSpread2({}, stylesheet.absoluteFillObject), {}, {
		height: "100%",
		margin: 0,
		appearance: "none",
		padding: 0,
		width: "100%"
	})
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/TextInput/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
/**
* Determines whether a 'selection' prop differs from a node's existing
* selection state.
*/
var isSelectionStale = (node, selection) => {
	var selectionEnd = node.selectionEnd, selectionStart = node.selectionStart;
	var start = selection.start, end = selection.end;
	return start !== selectionStart || end !== selectionEnd;
};
/**
* Certain input types do no support 'selectSelectionRange' and will throw an
* error.
*/
var setSelection = (node, selection) => {
	if (isSelectionStale(node, selection)) {
		var start = selection.start, end = selection.end;
		try {
			node.setSelectionRange(start, end || start);
		} catch (e) {}
	}
};
var forwardPropsList$1 = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
	autoCapitalize: true,
	autoComplete: true,
	autoCorrect: true,
	autoFocus: true,
	defaultValue: true,
	disabled: true,
	lang: true,
	maxLength: true,
	onChange: true,
	onScroll: true,
	placeholder: true,
	pointerEvents: true,
	readOnly: true,
	rows: true,
	spellCheck: true,
	value: true,
	type: true
});
var pickProps$1 = (props) => pick(props, forwardPropsList$1);
function isEventComposing(nativeEvent) {
	return nativeEvent.isComposing || nativeEvent.keyCode === 229;
}
var focusTimeout = null;
var TextInput = /*#__PURE__*/ import_react.forwardRef((props, forwardedRef) => {
	var _props$autoCapitalize = props.autoCapitalize, autoCapitalize = _props$autoCapitalize === void 0 ? "sentences" : _props$autoCapitalize, autoComplete = props.autoComplete, autoCompleteType = props.autoCompleteType, _props$autoCorrect = props.autoCorrect, autoCorrect = _props$autoCorrect === void 0 ? true : _props$autoCorrect, blurOnSubmit = props.blurOnSubmit, caretHidden = props.caretHidden, clearTextOnFocus = props.clearTextOnFocus, dir = props.dir, editable = props.editable, enterKeyHint = props.enterKeyHint, inputMode = props.inputMode, keyboardType = props.keyboardType, _props$multiline = props.multiline, multiline = _props$multiline === void 0 ? false : _props$multiline, numberOfLines = props.numberOfLines, onBlur = props.onBlur, onChange = props.onChange, onChangeText = props.onChangeText, onContentSizeChange = props.onContentSizeChange, onFocus = props.onFocus, onKeyPress = props.onKeyPress, onLayout = props.onLayout, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChange = props.onSelectionChange, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, onSubmitEditing = props.onSubmitEditing, placeholderTextColor = props.placeholderTextColor, _props$readOnly = props.readOnly, readOnly = _props$readOnly === void 0 ? false : _props$readOnly, returnKeyType = props.returnKeyType, rows = props.rows, _props$secureTextEntr = props.secureTextEntry, secureTextEntry = _props$secureTextEntr === void 0 ? false : _props$secureTextEntr, selection = props.selection, selectTextOnFocus = props.selectTextOnFocus, showSoftInputOnFocus = props.showSoftInputOnFocus, spellCheck = props.spellCheck;
	var type;
	var _inputMode;
	if (inputMode != null) {
		_inputMode = inputMode;
		if (inputMode === "email") type = "email";
		else if (inputMode === "tel") type = "tel";
		else if (inputMode === "search") type = "search";
		else if (inputMode === "url") type = "url";
		else type = "text";
	} else if (keyboardType != null) switch (keyboardType) {
		case "email-address":
			type = "email";
			break;
		case "number-pad":
		case "numeric":
			_inputMode = "numeric";
			break;
		case "decimal-pad":
			_inputMode = "decimal";
			break;
		case "phone-pad":
			type = "tel";
			break;
		case "search":
		case "web-search":
			type = "search";
			break;
		case "url":
			type = "url";
			break;
		default: type = "text";
	}
	if (secureTextEntry) type = "password";
	var dimensions = import_react.useRef({
		height: null,
		width: null
	});
	var hostRef = import_react.useRef(null);
	var prevSelection = import_react.useRef(null);
	var prevSecureTextEntry = import_react.useRef(false);
	import_react.useEffect(() => {
		if (hostRef.current && prevSelection.current) setSelection(hostRef.current, prevSelection.current);
		prevSecureTextEntry.current = secureTextEntry;
	}, [secureTextEntry]);
	var handleContentSizeChange = import_react.useCallback((hostNode) => {
		if (multiline && onContentSizeChange && hostNode != null) {
			var newHeight = hostNode.scrollHeight;
			var newWidth = hostNode.scrollWidth;
			if (newHeight !== dimensions.current.height || newWidth !== dimensions.current.width) {
				dimensions.current.height = newHeight;
				dimensions.current.width = newWidth;
				onContentSizeChange({ nativeEvent: { contentSize: {
					height: dimensions.current.height,
					width: dimensions.current.width
				} } });
			}
		}
	}, [multiline, onContentSizeChange]);
	var imperativeRef = import_react.useMemo(() => (hostNode) => {
		if (hostNode != null) {
			hostNode.clear = function() {
				if (hostNode != null) hostNode.value = "";
			};
			hostNode.isFocused = function() {
				return hostNode != null && TextInputState.currentlyFocusedField() === hostNode;
			};
			handleContentSizeChange(hostNode);
		}
	}, [handleContentSizeChange]);
	function handleBlur(e) {
		TextInputState._currentlyFocusedNode = null;
		if (onBlur) {
			e.nativeEvent.text = e.target.value;
			onBlur(e);
		}
	}
	function handleChange(e) {
		var hostNode = e.target;
		var text = hostNode.value;
		e.nativeEvent.text = text;
		handleContentSizeChange(hostNode);
		if (onChange) onChange(e);
		if (onChangeText) onChangeText(text);
	}
	function handleFocus(e) {
		var hostNode = e.target;
		if (onFocus) {
			e.nativeEvent.text = hostNode.value;
			onFocus(e);
		}
		if (hostNode != null) {
			TextInputState._currentlyFocusedNode = hostNode;
			if (clearTextOnFocus) hostNode.value = "";
			if (selectTextOnFocus) {
				if (focusTimeout != null) clearTimeout(focusTimeout);
				focusTimeout = setTimeout(() => {
					if (hostNode != null && document.activeElement === hostNode) hostNode.select();
				}, 0);
			}
		}
	}
	function handleKeyDown(e) {
		var hostNode = e.target;
		e.stopPropagation();
		var shouldBlurOnSubmit = blurOnSubmit == null ? !multiline : blurOnSubmit;
		var nativeEvent = e.nativeEvent;
		var isComposing = isEventComposing(nativeEvent);
		if (onKeyPress) onKeyPress(e);
		if (e.key === "Enter" && !e.shiftKey && !isComposing && !e.isDefaultPrevented()) {
			if ((blurOnSubmit || !multiline) && onSubmitEditing) {
				e.preventDefault();
				nativeEvent.text = e.target.value;
				onSubmitEditing(e);
			}
			if (shouldBlurOnSubmit && hostNode != null) setTimeout(() => hostNode.blur(), 0);
		}
	}
	function handleSelectionChange(e) {
		try {
			var _e$target = e.target;
			var _selection = {
				start: _e$target.selectionStart,
				end: _e$target.selectionEnd
			};
			if (onSelectionChange) {
				e.nativeEvent.selection = _selection;
				e.nativeEvent.text = e.target.value;
				onSelectionChange(e);
			}
			if (prevSecureTextEntry.current === secureTextEntry) prevSelection.current = _selection;
		} catch (e) {}
	}
	useLayoutEffectImpl(() => {
		var node = hostRef.current;
		if (node != null && selection != null) setSelection(node, selection);
		if (document.activeElement === node) TextInputState._currentlyFocusedNode = node;
	}, [hostRef, selection]);
	var component = multiline ? "textarea" : "input";
	useElementLayout(hostRef, onLayout);
	useResponderEvents(hostRef, {
		onMoveShouldSetResponder,
		onMoveShouldSetResponderCapture,
		onResponderEnd,
		onResponderGrant,
		onResponderMove,
		onResponderReject,
		onResponderRelease,
		onResponderStart,
		onResponderTerminate,
		onResponderTerminationRequest,
		onScrollShouldSetResponder,
		onScrollShouldSetResponderCapture,
		onSelectionChangeShouldSetResponder,
		onSelectionChangeShouldSetResponderCapture,
		onStartShouldSetResponder,
		onStartShouldSetResponderCapture
	});
	var contextDirection = useLocaleContext().direction;
	var supportedProps = pickProps$1(props);
	supportedProps.autoCapitalize = autoCapitalize;
	supportedProps.autoComplete = autoComplete || autoCompleteType || "on";
	supportedProps.autoCorrect = autoCorrect ? "on" : "off";
	supportedProps.dir = dir !== void 0 ? dir : "auto";
	supportedProps.enterKeyHint = enterKeyHint || returnKeyType;
	supportedProps.inputMode = _inputMode;
	supportedProps.onBlur = handleBlur;
	supportedProps.onChange = handleChange;
	supportedProps.onFocus = handleFocus;
	supportedProps.onKeyDown = handleKeyDown;
	supportedProps.onSelect = handleSelectionChange;
	supportedProps.readOnly = readOnly === true || editable === false;
	supportedProps.rows = multiline ? rows != null ? rows : numberOfLines : 1;
	supportedProps.spellCheck = spellCheck != null ? spellCheck : autoCorrect;
	supportedProps.style = [
		{ "--placeholderTextColor": placeholderTextColor },
		styles$1.textinput$raw,
		styles$1.placeholder,
		props.style,
		caretHidden && styles$1.caretHidden
	];
	supportedProps.type = multiline ? void 0 : type;
	supportedProps.virtualkeyboardpolicy = showSoftInputOnFocus === false ? "manual" : "auto";
	supportedProps.ref = useMergeRefs$1(hostRef, usePlatformMethods(supportedProps), imperativeRef, forwardedRef);
	var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
	return createElement(component, supportedProps, { writingDirection: props.dir || langDirection || contextDirection });
});
TextInput.displayName = "TextInput";
TextInput.State = TextInputState;
var styles$1 = stylesheet.create({
	textinput$raw: {
		MozAppearance: "textfield",
		WebkitAppearance: "none",
		backgroundColor: "transparent",
		border: "0 solid black",
		borderRadius: 0,
		boxSizing: "border-box",
		font: "14px System",
		margin: 0,
		padding: 0,
		resize: "none"
	},
	placeholder: { placeholderTextColor: "var(--placeholderTextColor)" },
	caretHidden: { caretColor: "transparent" }
});
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/vendor/react-native/PooledClass/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* From React 16.0.0
*/
var twoArgumentPooler$2 = function twoArgumentPooler(a1, a2) {
	var Klass = this;
	if (Klass.instancePool.length) {
		var instance = Klass.instancePool.pop();
		Klass.call(instance, a1, a2);
		return instance;
	} else return new Klass(a1, a2);
};
var standardReleaser = function standardReleaser(instance) {
	var Klass = this;
	instance.destructor();
	if (Klass.instancePool.length < Klass.poolSize) Klass.instancePool.push(instance);
};
var DEFAULT_POOL_SIZE = 10;
var DEFAULT_POOLER = twoArgumentPooler$2;
var PooledClass = {
	addPoolingTo: function addPoolingTo(CopyConstructor, pooler) {
		var NewKlass = CopyConstructor;
		NewKlass.instancePool = [];
		NewKlass.getPooled = pooler || DEFAULT_POOLER;
		if (!NewKlass.poolSize) NewKlass.poolSize = DEFAULT_POOL_SIZE;
		NewKlass.release = standardReleaser;
		return NewKlass;
	},
	twoArgumentPooler: twoArgumentPooler$2
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Touchable/BoundingDimensions.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var twoArgumentPooler$1 = PooledClass.twoArgumentPooler;
/**
* PooledClass representing the bounding rectangle of a region.
*/
function BoundingDimensions(width, height) {
	this.width = width;
	this.height = height;
}
BoundingDimensions.prototype.destructor = function() {
	this.width = null;
	this.height = null;
};
BoundingDimensions.getPooledFromElement = function(element) {
	return BoundingDimensions.getPooled(element.offsetWidth, element.offsetHeight);
};
PooledClass.addPoolingTo(BoundingDimensions, twoArgumentPooler$1);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Touchable/Position.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var twoArgumentPooler = PooledClass.twoArgumentPooler;
function Position(left, top) {
	this.left = left;
	this.top = top;
}
Position.prototype.destructor = function() {
	this.left = null;
	this.top = null;
};
PooledClass.addPoolingTo(Position, twoArgumentPooler);
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/Touchable/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var extractSingleTouch = (nativeEvent) => {
	var touches = nativeEvent.touches;
	var changedTouches = nativeEvent.changedTouches;
	var hasTouches = touches && touches.length > 0;
	var hasChangedTouches = changedTouches && changedTouches.length > 0;
	return !hasTouches && hasChangedTouches ? changedTouches[0] : hasTouches ? touches[0] : nativeEvent;
};
/**
* `Touchable`: Taps done right.
*
* You hook your `ResponderEventPlugin` events into `Touchable`. `Touchable`
* will measure time/geometry and tells you when to give feedback to the user.
*
* ====================== Touchable Tutorial ===============================
* The `Touchable` mixin helps you handle the "press" interaction. It analyzes
* the geometry of elements, and observes when another responder (scroll view
* etc) has stolen the touch lock. It notifies your component when it should
* give feedback to the user. (bouncing/highlighting/unhighlighting).
*
* - When a touch was activated (typically you highlight)
* - When a touch was deactivated (typically you unhighlight)
* - When a touch was "pressed" - a touch ended while still within the geometry
*   of the element, and no other element (like scroller) has "stolen" touch
*   lock ("responder") (Typically you bounce the element).
*
* A good tap interaction isn't as simple as you might think. There should be a
* slight delay before showing a highlight when starting a touch. If a
* subsequent touch move exceeds the boundary of the element, it should
* unhighlight, but if that same touch is brought back within the boundary, it
* should rehighlight again. A touch can move in and out of that boundary
* several times, each time toggling highlighting, but a "press" is only
* triggered if that touch ends while within the element's boundary and no
* scroller (or anything else) has stolen the lock on touches.
*
* To create a new type of component that handles interaction using the
* `Touchable` mixin, do the following:
*
* - Initialize the `Touchable` state.
*
*   getInitialState: function() {
*     return merge(this.touchableGetInitialState(), yourComponentState);
*   }
*
* - Add a method to get your touchable component's node.
*   getTouchableNode: function() {
*     return this.touchableRef.current
*   }
*
* - Choose the rendered component who's touches should start the interactive
*   sequence. On that rendered node, forward all `Touchable` responder
*   handlers. You can choose any rendered node you like. Choose a node whose
*   hit target you'd like to instigate the interaction sequence:
*
*   // In render function:
*   return (
*     <View
*       ref={this.touchableRef}
*       onStartShouldSetResponder={this.touchableHandleStartShouldSetResponder}
*       onResponderTerminationRequest={this.touchableHandleResponderTerminationRequest}
*       onResponderGrant={this.touchableHandleResponderGrant}
*       onResponderMove={this.touchableHandleResponderMove}
*       onResponderRelease={this.touchableHandleResponderRelease}
*       onResponderTerminate={this.touchableHandleResponderTerminate}>
*       <View>
*         Even though the hit detection/interactions are triggered by the
*         wrapping (typically larger) node, we usually end up implementing
*         custom logic that highlights this inner one.
*       </View>
*     </View>
*   );
*
* - You may set up your own handlers for each of these events, so long as you
*   also invoke the `touchable*` handlers inside of your custom handler.
*
* - Implement the handlers on your component class in order to provide
*   feedback to the user. See documentation for each of these class methods
*   that you should implement.
*
*   touchableHandlePress: function() {
*      this.performBounceAnimation();  // or whatever you want to do.
*   },
*   touchableHandleActivePressIn: function() {
*     this.beginHighlighting(...);  // Whatever you like to convey activation
*   },
*   touchableHandleActivePressOut: function() {
*     this.endHighlighting(...);  // Whatever you like to convey deactivation
*   },
*
* - There are more advanced methods you can implement (see documentation below):
*   touchableGetHighlightDelayMS: function() {
*     return 20;
*   }
*   // In practice, *always* use a predeclared constant (conserve memory).
*   touchableGetPressRectOffset: function() {
*     return {top: 20, left: 20, right: 20, bottom: 100};
*   }
*/
/**
* Touchable states.
*/
var States = {
	NOT_RESPONDER: "NOT_RESPONDER",
	RESPONDER_INACTIVE_PRESS_IN: "RESPONDER_INACTIVE_PRESS_IN",
	RESPONDER_INACTIVE_PRESS_OUT: "RESPONDER_INACTIVE_PRESS_OUT",
	RESPONDER_ACTIVE_PRESS_IN: "RESPONDER_ACTIVE_PRESS_IN",
	RESPONDER_ACTIVE_PRESS_OUT: "RESPONDER_ACTIVE_PRESS_OUT",
	RESPONDER_ACTIVE_LONG_PRESS_IN: "RESPONDER_ACTIVE_LONG_PRESS_IN",
	RESPONDER_ACTIVE_LONG_PRESS_OUT: "RESPONDER_ACTIVE_LONG_PRESS_OUT",
	ERROR: "ERROR"
};
var baseStatesConditions = {
	NOT_RESPONDER: false,
	RESPONDER_INACTIVE_PRESS_IN: false,
	RESPONDER_INACTIVE_PRESS_OUT: false,
	RESPONDER_ACTIVE_PRESS_IN: false,
	RESPONDER_ACTIVE_PRESS_OUT: false,
	RESPONDER_ACTIVE_LONG_PRESS_IN: false,
	RESPONDER_ACTIVE_LONG_PRESS_OUT: false,
	ERROR: false
};
var IsActive = _objectSpread2(_objectSpread2({}, baseStatesConditions), {}, {
	RESPONDER_ACTIVE_PRESS_OUT: true,
	RESPONDER_ACTIVE_PRESS_IN: true
});
/**
* Quick lookup for states that are considered to be "pressing" and are
* therefore eligible to result in a "selection" if the press stops.
*/
var IsPressingIn = _objectSpread2(_objectSpread2({}, baseStatesConditions), {}, {
	RESPONDER_INACTIVE_PRESS_IN: true,
	RESPONDER_ACTIVE_PRESS_IN: true,
	RESPONDER_ACTIVE_LONG_PRESS_IN: true
});
var IsLongPressingIn = _objectSpread2(_objectSpread2({}, baseStatesConditions), {}, { RESPONDER_ACTIVE_LONG_PRESS_IN: true });
/**
* Inputs to the state machine.
*/
var Signals = {
	DELAY: "DELAY",
	RESPONDER_GRANT: "RESPONDER_GRANT",
	RESPONDER_RELEASE: "RESPONDER_RELEASE",
	RESPONDER_TERMINATED: "RESPONDER_TERMINATED",
	ENTER_PRESS_RECT: "ENTER_PRESS_RECT",
	LEAVE_PRESS_RECT: "LEAVE_PRESS_RECT",
	LONG_PRESS_DETECTED: "LONG_PRESS_DETECTED"
};
/**
* Mapping from States x Signals => States
*/
var Transitions = {
	NOT_RESPONDER: {
		DELAY: States.ERROR,
		RESPONDER_GRANT: States.RESPONDER_INACTIVE_PRESS_IN,
		RESPONDER_RELEASE: States.ERROR,
		RESPONDER_TERMINATED: States.ERROR,
		ENTER_PRESS_RECT: States.ERROR,
		LEAVE_PRESS_RECT: States.ERROR,
		LONG_PRESS_DETECTED: States.ERROR
	},
	RESPONDER_INACTIVE_PRESS_IN: {
		DELAY: States.RESPONDER_ACTIVE_PRESS_IN,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_INACTIVE_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_INACTIVE_PRESS_OUT,
		LONG_PRESS_DETECTED: States.ERROR
	},
	RESPONDER_INACTIVE_PRESS_OUT: {
		DELAY: States.RESPONDER_ACTIVE_PRESS_OUT,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_INACTIVE_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_INACTIVE_PRESS_OUT,
		LONG_PRESS_DETECTED: States.ERROR
	},
	RESPONDER_ACTIVE_PRESS_IN: {
		DELAY: States.ERROR,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_ACTIVE_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_ACTIVE_PRESS_OUT,
		LONG_PRESS_DETECTED: States.RESPONDER_ACTIVE_LONG_PRESS_IN
	},
	RESPONDER_ACTIVE_PRESS_OUT: {
		DELAY: States.ERROR,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_ACTIVE_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_ACTIVE_PRESS_OUT,
		LONG_PRESS_DETECTED: States.ERROR
	},
	RESPONDER_ACTIVE_LONG_PRESS_IN: {
		DELAY: States.ERROR,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_ACTIVE_LONG_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_ACTIVE_LONG_PRESS_OUT,
		LONG_PRESS_DETECTED: States.RESPONDER_ACTIVE_LONG_PRESS_IN
	},
	RESPONDER_ACTIVE_LONG_PRESS_OUT: {
		DELAY: States.ERROR,
		RESPONDER_GRANT: States.ERROR,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.RESPONDER_ACTIVE_LONG_PRESS_IN,
		LEAVE_PRESS_RECT: States.RESPONDER_ACTIVE_LONG_PRESS_OUT,
		LONG_PRESS_DETECTED: States.ERROR
	},
	error: {
		DELAY: States.NOT_RESPONDER,
		RESPONDER_GRANT: States.RESPONDER_INACTIVE_PRESS_IN,
		RESPONDER_RELEASE: States.NOT_RESPONDER,
		RESPONDER_TERMINATED: States.NOT_RESPONDER,
		ENTER_PRESS_RECT: States.NOT_RESPONDER,
		LEAVE_PRESS_RECT: States.NOT_RESPONDER,
		LONG_PRESS_DETECTED: States.NOT_RESPONDER
	}
};
var HIGHLIGHT_DELAY_MS = 130;
var PRESS_EXPAND_PX = 20;
var LONG_PRESS_DELAY_MS = 500 - HIGHLIGHT_DELAY_MS;
var LONG_PRESS_ALLOWED_MOVEMENT = 10;
/**
* By convention, methods prefixed with underscores are meant to be @private,
* and not @protected. Mixers shouldn't access them - not even to provide them
* as callback handlers.
*
*
* ========== Geometry =========
* `Touchable` only assumes that there exists a `HitRect` node. The `PressRect`
* is an abstract box that is extended beyond the `HitRect`.
*
*  +--------------------------+
*  |                          | - "Start" events in `HitRect` cause `HitRect`
*  |  +--------------------+  |   to become the responder.
*  |  |  +--------------+  |  | - `HitRect` is typically expanded around
*  |  |  |              |  |  |   the `VisualRect`, but shifted downward.
*  |  |  |  VisualRect  |  |  | - After pressing down, after some delay,
*  |  |  |              |  |  |   and before letting up, the Visual React
*  |  |  +--------------+  |  |   will become "active". This makes it eligible
*  |  |     HitRect        |  |   for being highlighted (so long as the
*  |  +--------------------+  |   press remains in the `PressRect`).
*  |        PressRect     o   |
*  +----------------------|---+
*           Out Region    |
*                         +-----+ This gap between the `HitRect` and
*                                 `PressRect` allows a touch to move far away
*                                 from the original hit rect, and remain
*                                 highlighted, and eligible for a "Press".
*                                 Customize this via
*                                 `touchableGetPressRectOffset()`.
*
*
*
* ======= State Machine =======
*
* +-------------+ <---+ RESPONDER_RELEASE
* |NOT_RESPONDER|
* +-------------+ <---+ RESPONDER_TERMINATED
*     +
*     | RESPONDER_GRANT (HitRect)
*     v
* +---------------------------+  DELAY   +-------------------------+  T + DELAY     +------------------------------+
* |RESPONDER_INACTIVE_PRESS_IN|+-------->|RESPONDER_ACTIVE_PRESS_IN| +------------> |RESPONDER_ACTIVE_LONG_PRESS_IN|
* +---------------------------+          +-------------------------+                +------------------------------+
*     +            ^                         +           ^                                 +           ^
*     |LEAVE_      |ENTER_                   |LEAVE_     |ENTER_                           |LEAVE_     |ENTER_
*     |PRESS_RECT  |PRESS_RECT               |PRESS_RECT |PRESS_RECT                       |PRESS_RECT |PRESS_RECT
*     |            |                         |           |                                 |           |
*     v            +                         v           +                                 v           +
* +----------------------------+  DELAY  +--------------------------+               +-------------------------------+
* |RESPONDER_INACTIVE_PRESS_OUT|+------->|RESPONDER_ACTIVE_PRESS_OUT|               |RESPONDER_ACTIVE_LONG_PRESS_OUT|
* +----------------------------+         +--------------------------+               +-------------------------------+
*
* T + DELAY => LONG_PRESS_DELAY_MS + DELAY
*
* Not drawn are the side effects of each transition. The most important side
* effect is the `touchableHandlePress` abstract method invocation that occurs
* when a responder is released while in either of the "Press" states.
*
* The other important side effects are the highlight abstract method
* invocations (internal callbacks) to be implemented by the mixer.
*
*
* @lends Touchable.prototype
*/
var TouchableMixin = {
	componentDidMount: function componentDidMount() {
		warnOnce("TouchableMixin", "TouchableMixin is deprecated. Please use Pressable.");
		var touchableNode = this.getTouchableNode && this.getTouchableNode();
		if (touchableNode && touchableNode.addEventListener) {
			this._touchableBlurListener = (e) => {
				if (this._isTouchableKeyboardActive) {
					if (this.state.touchable.touchState && this.state.touchable.touchState !== States.NOT_RESPONDER) this.touchableHandleResponderTerminate({ nativeEvent: e });
					this._isTouchableKeyboardActive = false;
				}
			};
			touchableNode.addEventListener("blur", this._touchableBlurListener);
		}
	},
	/**
	* Clear all timeouts on unmount
	*/
	componentWillUnmount: function componentWillUnmount() {
		var touchableNode = this.getTouchableNode && this.getTouchableNode();
		if (touchableNode && touchableNode.addEventListener) touchableNode.removeEventListener("blur", this._touchableBlurListener);
		this.touchableDelayTimeout && clearTimeout(this.touchableDelayTimeout);
		this.longPressDelayTimeout && clearTimeout(this.longPressDelayTimeout);
		this.pressOutDelayTimeout && clearTimeout(this.pressOutDelayTimeout);
		this.pressInLocation = null;
		this.state.touchable.responderID = null;
	},
	/**
	* It's prefer that mixins determine state in this way, having the class
	* explicitly mix the state in the one and only `getInitialState` method.
	*
	* @return {object} State object to be placed inside of
	* `this.state.touchable`.
	*/
	touchableGetInitialState: function touchableGetInitialState() {
		return { touchable: {
			touchState: void 0,
			responderID: null
		} };
	},
	/**
	* Must return true if embedded in a native platform scroll view.
	*/
	touchableHandleResponderTerminationRequest: function touchableHandleResponderTerminationRequest() {
		return !this.props.rejectResponderTermination;
	},
	/**
	* Must return true to start the process of `Touchable`.
	*/
	touchableHandleStartShouldSetResponder: function touchableHandleStartShouldSetResponder() {
		return !this.props.disabled;
	},
	/**
	* Return true to cancel press on long press.
	*/
	touchableLongPressCancelsPress: function touchableLongPressCancelsPress() {
		return true;
	},
	/**
	* Place as callback for a DOM element's `onResponderGrant` event.
	* @param {SyntheticEvent} e Synthetic event from event system.
	*
	*/
	touchableHandleResponderGrant: function touchableHandleResponderGrant(e) {
		var dispatchID = e.currentTarget;
		e.persist();
		this.pressOutDelayTimeout && clearTimeout(this.pressOutDelayTimeout);
		this.pressOutDelayTimeout = null;
		this.state.touchable.touchState = States.NOT_RESPONDER;
		this.state.touchable.responderID = dispatchID;
		this._receiveSignal(Signals.RESPONDER_GRANT, e);
		var delayMS = this.touchableGetHighlightDelayMS !== void 0 ? Math.max(this.touchableGetHighlightDelayMS(), 0) : HIGHLIGHT_DELAY_MS;
		delayMS = isNaN(delayMS) ? HIGHLIGHT_DELAY_MS : delayMS;
		if (delayMS !== 0) this.touchableDelayTimeout = setTimeout(this._handleDelay.bind(this, e), delayMS);
		else this._handleDelay(e);
		var longDelayMS = this.touchableGetLongPressDelayMS !== void 0 ? Math.max(this.touchableGetLongPressDelayMS(), 10) : LONG_PRESS_DELAY_MS;
		longDelayMS = isNaN(longDelayMS) ? LONG_PRESS_DELAY_MS : longDelayMS;
		this.longPressDelayTimeout = setTimeout(this._handleLongDelay.bind(this, e), longDelayMS + delayMS);
	},
	/**
	* Place as callback for a DOM element's `onResponderRelease` event.
	*/
	touchableHandleResponderRelease: function touchableHandleResponderRelease(e) {
		this.pressInLocation = null;
		this._receiveSignal(Signals.RESPONDER_RELEASE, e);
	},
	/**
	* Place as callback for a DOM element's `onResponderTerminate` event.
	*/
	touchableHandleResponderTerminate: function touchableHandleResponderTerminate(e) {
		this.pressInLocation = null;
		this._receiveSignal(Signals.RESPONDER_TERMINATED, e);
	},
	/**
	* Place as callback for a DOM element's `onResponderMove` event.
	*/
	touchableHandleResponderMove: function touchableHandleResponderMove(e) {
		if (!this.state.touchable.positionOnActivate) return;
		var positionOnActivate = this.state.touchable.positionOnActivate;
		var dimensionsOnActivate = this.state.touchable.dimensionsOnActivate;
		var pressRectOffset = this.touchableGetPressRectOffset ? this.touchableGetPressRectOffset() : {
			left: PRESS_EXPAND_PX,
			right: PRESS_EXPAND_PX,
			top: PRESS_EXPAND_PX,
			bottom: PRESS_EXPAND_PX
		};
		var pressExpandLeft = pressRectOffset.left;
		var pressExpandTop = pressRectOffset.top;
		var pressExpandRight = pressRectOffset.right;
		var pressExpandBottom = pressRectOffset.bottom;
		var hitSlop = this.touchableGetHitSlop ? this.touchableGetHitSlop() : null;
		if (hitSlop) {
			pressExpandLeft += hitSlop.left || 0;
			pressExpandTop += hitSlop.top || 0;
			pressExpandRight += hitSlop.right || 0;
			pressExpandBottom += hitSlop.bottom || 0;
		}
		var touch = extractSingleTouch(e.nativeEvent);
		var pageX = touch && touch.pageX;
		var pageY = touch && touch.pageY;
		if (this.pressInLocation) {
			if (this._getDistanceBetweenPoints(pageX, pageY, this.pressInLocation.pageX, this.pressInLocation.pageY) > LONG_PRESS_ALLOWED_MOVEMENT) this._cancelLongPressDelayTimeout();
		}
		if (pageX > positionOnActivate.left - pressExpandLeft && pageY > positionOnActivate.top - pressExpandTop && pageX < positionOnActivate.left + dimensionsOnActivate.width + pressExpandRight && pageY < positionOnActivate.top + dimensionsOnActivate.height + pressExpandBottom) {
			var prevState = this.state.touchable.touchState;
			this._receiveSignal(Signals.ENTER_PRESS_RECT, e);
			if (this.state.touchable.touchState === States.RESPONDER_INACTIVE_PRESS_IN && prevState !== States.RESPONDER_INACTIVE_PRESS_IN) this._cancelLongPressDelayTimeout();
		} else {
			this._cancelLongPressDelayTimeout();
			this._receiveSignal(Signals.LEAVE_PRESS_RECT, e);
		}
	},
	/**
	* Invoked when the item receives focus. Mixers might override this to
	* visually distinguish the `VisualRect` so that the user knows that it
	* currently has the focus. Most platforms only support a single element being
	* focused at a time, in which case there may have been a previously focused
	* element that was blurred just prior to this. This can be overridden when
	* using `Touchable.Mixin.withoutDefaultFocusAndBlur`.
	*/
	touchableHandleFocus: function touchableHandleFocus(e) {
		this.props.onFocus && this.props.onFocus(e);
	},
	/**
	* Invoked when the item loses focus. Mixers might override this to
	* visually distinguish the `VisualRect` so that the user knows that it
	* no longer has focus. Most platforms only support a single element being
	* focused at a time, in which case the focus may have moved to another.
	* This can be overridden when using
	* `Touchable.Mixin.withoutDefaultFocusAndBlur`.
	*/
	touchableHandleBlur: function touchableHandleBlur(e) {
		this.props.onBlur && this.props.onBlur(e);
	},
	/**
	* Invoked when the item should be highlighted. Mixers should implement this
	* to visually distinguish the `VisualRect` so that the user knows that
	* releasing a touch will result in a "selection" (analog to click).
	*
	* @abstract
	* touchableHandleActivePressIn: function,
	*/
	/**
	* Invoked when the item is "active" (in that it is still eligible to become
	* a "select") but the touch has left the `PressRect`. Usually the mixer will
	* want to unhighlight the `VisualRect`. If the user (while pressing) moves
	* back into the `PressRect` `touchableHandleActivePressIn` will be invoked
	* again and the mixer should probably highlight the `VisualRect` again. This
	* event will not fire on an `touchEnd/mouseUp` event, only move events while
	* the user is depressing the mouse/touch.
	*
	* @abstract
	* touchableHandleActivePressOut: function
	*/
	/**
	* Invoked when the item is "selected" - meaning the interaction ended by
	* letting up while the item was either in the state
	* `RESPONDER_ACTIVE_PRESS_IN` or `RESPONDER_INACTIVE_PRESS_IN`.
	*
	* @abstract
	* touchableHandlePress: function
	*/
	/**
	* Invoked when the item is long pressed - meaning the interaction ended by
	* letting up while the item was in `RESPONDER_ACTIVE_LONG_PRESS_IN`. If
	* `touchableHandleLongPress` is *not* provided, `touchableHandlePress` will
	* be called as it normally is. If `touchableHandleLongPress` is provided, by
	* default any `touchableHandlePress` callback will not be invoked. To
	* override this default behavior, override `touchableLongPressCancelsPress`
	* to return false. As a result, `touchableHandlePress` will be called when
	* lifting up, even if `touchableHandleLongPress` has also been called.
	*
	* @abstract
	* touchableHandleLongPress: function
	*/
	/**
	* Returns the number of millis to wait before triggering a highlight.
	*
	* @abstract
	* touchableGetHighlightDelayMS: function
	*/
	/**
	* Returns the amount to extend the `HitRect` into the `PressRect`. Positive
	* numbers mean the size expands outwards.
	*
	* @abstract
	* touchableGetPressRectOffset: function
	*/
	/**
	* Measures the `HitRect` node on activation. The Bounding rectangle is with
	* respect to viewport - not page, so adding the `pageXOffset/pageYOffset`
	* should result in points that are in the same coordinate system as an
	* event's `globalX/globalY` data values.
	*
	* - Consider caching this for the lifetime of the component, or possibly
	*   being able to share this cache between any `ScrollMap` view.
	*
	* @sideeffects
	* @private
	*/
	_remeasureMetricsOnActivation: function _remeasureMetricsOnActivation() {
		var tag = this.state.touchable.responderID;
		if (tag == null) return;
		UIManager.measure(tag, this._handleQueryLayout);
	},
	_handleQueryLayout: function _handleQueryLayout(l, t, w, h, globalX, globalY) {
		if (!l && !t && !w && !h && !globalX && !globalY) return;
		this.state.touchable.positionOnActivate && Position.release(this.state.touchable.positionOnActivate);
		this.state.touchable.dimensionsOnActivate && BoundingDimensions.release(this.state.touchable.dimensionsOnActivate);
		this.state.touchable.positionOnActivate = Position.getPooled(globalX, globalY);
		this.state.touchable.dimensionsOnActivate = BoundingDimensions.getPooled(w, h);
	},
	_handleDelay: function _handleDelay(e) {
		this.touchableDelayTimeout = null;
		this._receiveSignal(Signals.DELAY, e);
	},
	_handleLongDelay: function _handleLongDelay(e) {
		this.longPressDelayTimeout = null;
		var curState = this.state.touchable.touchState;
		if (curState !== States.RESPONDER_ACTIVE_PRESS_IN && curState !== States.RESPONDER_ACTIVE_LONG_PRESS_IN) console.error("Attempted to transition from state `" + curState + "` to `" + States.RESPONDER_ACTIVE_LONG_PRESS_IN + "`, which is not supported. This is most likely due to `Touchable.longPressDelayTimeout` not being cancelled.");
		else this._receiveSignal(Signals.LONG_PRESS_DETECTED, e);
	},
	/**
	* Receives a state machine signal, performs side effects of the transition
	* and stores the new state. Validates the transition as well.
	*
	* @param {Signals} signal State machine signal.
	* @throws Error if invalid state transition or unrecognized signal.
	* @sideeffects
	*/
	_receiveSignal: function _receiveSignal(signal, e) {
		var responderID = this.state.touchable.responderID;
		var curState = this.state.touchable.touchState;
		var nextState = Transitions[curState] && Transitions[curState][signal];
		if (!responderID && signal === Signals.RESPONDER_RELEASE) return;
		if (!nextState) throw new Error("Unrecognized signal `" + signal + "` or state `" + curState + "` for Touchable responder `" + responderID + "`");
		if (nextState === States.ERROR) throw new Error("Touchable cannot transition from `" + curState + "` to `" + signal + "` for responder `" + responderID + "`");
		if (curState !== nextState) {
			this._performSideEffectsForTransition(curState, nextState, signal, e);
			this.state.touchable.touchState = nextState;
		}
	},
	_cancelLongPressDelayTimeout: function _cancelLongPressDelayTimeout() {
		this.longPressDelayTimeout && clearTimeout(this.longPressDelayTimeout);
		this.longPressDelayTimeout = null;
	},
	_isHighlight: function _isHighlight(state) {
		return state === States.RESPONDER_ACTIVE_PRESS_IN || state === States.RESPONDER_ACTIVE_LONG_PRESS_IN;
	},
	_savePressInLocation: function _savePressInLocation(e) {
		var touch = extractSingleTouch(e.nativeEvent);
		var pageX = touch && touch.pageX;
		var pageY = touch && touch.pageY;
		var locationX = touch && touch.locationX;
		var locationY = touch && touch.locationY;
		this.pressInLocation = {
			pageX,
			pageY,
			locationX,
			locationY
		};
	},
	_getDistanceBetweenPoints: function _getDistanceBetweenPoints(aX, aY, bX, bY) {
		var deltaX = aX - bX;
		var deltaY = aY - bY;
		return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	},
	/**
	* Will perform a transition between touchable states, and identify any
	* highlighting or unhighlighting that must be performed for this particular
	* transition.
	*
	* @param {States} curState Current Touchable state.
	* @param {States} nextState Next Touchable state.
	* @param {Signal} signal Signal that triggered the transition.
	* @param {Event} e Native event.
	* @sideeffects
	*/
	_performSideEffectsForTransition: function _performSideEffectsForTransition(curState, nextState, signal, e) {
		var curIsHighlight = this._isHighlight(curState);
		var newIsHighlight = this._isHighlight(nextState);
		if (signal === Signals.RESPONDER_TERMINATED || signal === Signals.RESPONDER_RELEASE) this._cancelLongPressDelayTimeout();
		var isInitialTransition = curState === States.NOT_RESPONDER && nextState === States.RESPONDER_INACTIVE_PRESS_IN;
		var isActiveTransition = !IsActive[curState] && IsActive[nextState];
		if (isInitialTransition || isActiveTransition) this._remeasureMetricsOnActivation();
		if (IsPressingIn[curState] && signal === Signals.LONG_PRESS_DETECTED) this.touchableHandleLongPress && this.touchableHandleLongPress(e);
		if (newIsHighlight && !curIsHighlight) this._startHighlight(e);
		else if (!newIsHighlight && curIsHighlight) this._endHighlight(e);
		if (IsPressingIn[curState] && signal === Signals.RESPONDER_RELEASE) {
			var hasLongPressHandler = !!this.props.onLongPress;
			var pressIsLongButStillCallOnPress = IsLongPressingIn[curState] && (!hasLongPressHandler || !this.touchableLongPressCancelsPress());
			if ((!IsLongPressingIn[curState] || pressIsLongButStillCallOnPress) && this.touchableHandlePress) {
				if (!newIsHighlight && !curIsHighlight) {
					this._startHighlight(e);
					this._endHighlight(e);
				}
				this.touchableHandlePress(e);
			}
		}
		this.touchableDelayTimeout && clearTimeout(this.touchableDelayTimeout);
		this.touchableDelayTimeout = null;
	},
	_playTouchSound: function _playTouchSound() {
		UIManager.playTouchSound();
	},
	_startHighlight: function _startHighlight(e) {
		this._savePressInLocation(e);
		this.touchableHandleActivePressIn && this.touchableHandleActivePressIn(e);
	},
	_endHighlight: function _endHighlight(e) {
		if (this.touchableHandleActivePressOut) {
			if (this.touchableGetPressOutDelayMS && this.touchableGetPressOutDelayMS()) this.pressOutDelayTimeout = setTimeout(() => {
				this.touchableHandleActivePressOut(e);
			}, this.touchableGetPressOutDelayMS());
			else this.touchableHandleActivePressOut(e);
		}
	},
	touchableHandleKeyEvent: function touchableHandleKeyEvent(e) {
		var type = e.type, key = e.key;
		if (key === "Enter" || key === " ") {
			if (type === "keydown") {
				if (!this._isTouchableKeyboardActive) {
					if (!this.state.touchable.touchState || this.state.touchable.touchState === States.NOT_RESPONDER) {
						this.touchableHandleResponderGrant(e);
						this._isTouchableKeyboardActive = true;
					}
				}
			} else if (type === "keyup") {
				if (this._isTouchableKeyboardActive) {
					if (this.state.touchable.touchState && this.state.touchable.touchState !== States.NOT_RESPONDER) {
						this.touchableHandleResponderRelease(e);
						this._isTouchableKeyboardActive = false;
					}
				}
			}
			e.stopPropagation();
			if (!(key === "Enter" && AccessibilityUtil.propsToAriaRole(this.props) === "link")) e.preventDefault();
		}
	},
	withoutDefaultFocusAndBlur: {}
};
TouchableMixin.touchableHandleFocus;
TouchableMixin.touchableHandleBlur;
TouchableMixin.withoutDefaultFocusAndBlur = _objectWithoutPropertiesLoose(TouchableMixin, ["touchableHandleFocus", "touchableHandleBlur"]);
var Touchable = {
	Mixin: TouchableMixin,
	TOUCH_TARGET_DEBUG: false,
	/**
	* Renders a debugging overlay to visualize touch target with hitSlop (might not work on Android).
	*/
	renderDebugView: (_ref) => {
		_ref.color;
		_ref.hitSlop;
		if (!Touchable.TOUCH_TARGET_DEBUG) return null;
		throw Error("Touchable.TOUCH_TARGET_DEBUG should not be enabled in prod!");
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/TouchableHighlight/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var _excluded$1 = [
	"activeOpacity",
	"children",
	"delayPressIn",
	"delayPressOut",
	"delayLongPress",
	"disabled",
	"focusable",
	"onHideUnderlay",
	"onLongPress",
	"onPress",
	"onPressIn",
	"onPressOut",
	"onShowUnderlay",
	"rejectResponderTermination",
	"style",
	"testOnly_pressed",
	"underlayColor"
];
function createExtraStyles(activeOpacity, underlayColor) {
	return {
		child: { opacity: activeOpacity !== null && activeOpacity !== void 0 ? activeOpacity : .85 },
		underlay: { backgroundColor: underlayColor === void 0 ? "black" : underlayColor }
	};
}
function hasPressHandler(props) {
	return props.onPress != null || props.onPressIn != null || props.onPressOut != null || props.onLongPress != null;
}
/**
* A wrapper for making views respond properly to touches.
* On press down, the opacity of the wrapped view is decreased, which allows
* the underlay color to show through, darkening or tinting the view.
*
* The underlay comes from wrapping the child in a new View, which can affect
* layout, and sometimes cause unwanted visual artifacts if not used correctly,
* for example if the backgroundColor of the wrapped view isn't explicitly set
* to an opaque color.
*
* TouchableHighlight must have one child (not zero or more than one).
* If you wish to have several child components, wrap them in a View.
*/
function TouchableHighlight(props, forwardedRef) {
	var activeOpacity = props.activeOpacity, children = props.children, delayPressIn = props.delayPressIn, delayPressOut = props.delayPressOut, delayLongPress = props.delayLongPress, disabled = props.disabled, focusable = props.focusable, onHideUnderlay = props.onHideUnderlay, onLongPress = props.onLongPress, onPress = props.onPress, onPressIn = props.onPressIn, onPressOut = props.onPressOut, onShowUnderlay = props.onShowUnderlay, rejectResponderTermination = props.rejectResponderTermination, style = props.style, testOnly_pressed = props.testOnly_pressed, underlayColor = props.underlayColor, rest = _objectWithoutPropertiesLoose(props, _excluded$1);
	var hostRef = (0, import_react.useRef)(null);
	var setRef = useMergeRefs$1(forwardedRef, hostRef);
	var _useState = (0, import_react.useState)(testOnly_pressed === true ? createExtraStyles(activeOpacity, underlayColor) : null), extraStyles = _useState[0], setExtraStyles = _useState[1];
	var showUnderlay = (0, import_react.useCallback)(() => {
		if (!hasPressHandler(props)) return;
		setExtraStyles(createExtraStyles(activeOpacity, underlayColor));
		if (onShowUnderlay != null) onShowUnderlay();
	}, [
		activeOpacity,
		onShowUnderlay,
		props,
		underlayColor
	]);
	var hideUnderlay = (0, import_react.useCallback)(() => {
		if (testOnly_pressed === true) return;
		if (hasPressHandler(props)) {
			setExtraStyles(null);
			if (onHideUnderlay != null) onHideUnderlay();
		}
	}, [
		onHideUnderlay,
		props,
		testOnly_pressed
	]);
	var pressEventHandlers = usePressEvents(hostRef, (0, import_react.useMemo)(() => ({
		cancelable: !rejectResponderTermination,
		disabled,
		delayLongPress,
		delayPressStart: delayPressIn,
		delayPressEnd: delayPressOut,
		onLongPress,
		onPress,
		onPressStart(event) {
			showUnderlay();
			if (onPressIn != null) onPressIn(event);
		},
		onPressEnd(event) {
			hideUnderlay();
			if (onPressOut != null) onPressOut(event);
		}
	}), [
		delayLongPress,
		delayPressIn,
		delayPressOut,
		disabled,
		onLongPress,
		onPress,
		onPressIn,
		onPressOut,
		rejectResponderTermination,
		showUnderlay,
		hideUnderlay
	]));
	var child = import_react.Children.only(children);
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, rest, pressEventHandlers, {
		accessibilityDisabled: disabled,
		focusable: !disabled && focusable !== false,
		pointerEvents: disabled ? "box-none" : void 0,
		ref: setRef,
		style: [
			styles.root,
			style,
			!disabled && styles.actionable,
			extraStyles && extraStyles.underlay
		]
	}), /*#__PURE__*/ import_react.cloneElement(child, { style: [child.props.style, extraStyles && extraStyles.child] }));
}
var styles = stylesheet.create({
	root: { userSelect: "none" },
	actionable: {
		cursor: "pointer",
		touchAction: "manipulation"
	}
});
var MemoedTouchableHighlight = /*#__PURE__*/ import_react.memo(/*#__PURE__*/ import_react.forwardRef(TouchableHighlight));
MemoedTouchableHighlight.displayName = "TouchableHighlight";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/modules/UnimplementedView/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var _excluded = ["style"];
/**
* Common implementation for a simple stubbed view.
*/
function UnimplementedView(_ref) {
	var style = _ref.style, props = _objectWithoutPropertiesLoose(_ref, _excluded);
	return /*#__PURE__*/ import_react.createElement(View, _extends({}, props, { style: [unimplementedViewStyles, style] }));
}
var unimplementedViewStyles = {
	alignSelf: "flex-start",
	borderColor: "red",
	borderWidth: 1
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/TouchableNativeFeedback/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var TouchableNativeFeedback_default = UnimplementedView;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/TouchableWithoutFeedback/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
* @format
*/
var forwardPropsList = {
	accessibilityDisabled: true,
	accessibilityLabel: true,
	accessibilityLiveRegion: true,
	accessibilityRole: true,
	accessibilityState: true,
	accessibilityValue: true,
	children: true,
	disabled: true,
	focusable: true,
	nativeID: true,
	onBlur: true,
	onFocus: true,
	onLayout: true,
	testID: true
};
var pickProps = (props) => pick(props, forwardPropsList);
function TouchableWithoutFeedback(props, forwardedRef) {
	warnOnce("TouchableWithoutFeedback", "TouchableWithoutFeedback is deprecated. Please use Pressable.");
	var delayPressIn = props.delayPressIn, delayPressOut = props.delayPressOut, delayLongPress = props.delayLongPress, disabled = props.disabled, focusable = props.focusable, onLongPress = props.onLongPress, onPress = props.onPress, onPressIn = props.onPressIn, onPressOut = props.onPressOut, rejectResponderTermination = props.rejectResponderTermination;
	var hostRef = (0, import_react.useRef)(null);
	var pressEventHandlers = usePressEvents(hostRef, (0, import_react.useMemo)(() => ({
		cancelable: !rejectResponderTermination,
		disabled,
		delayLongPress,
		delayPressStart: delayPressIn,
		delayPressEnd: delayPressOut,
		onLongPress,
		onPress,
		onPressStart: onPressIn,
		onPressEnd: onPressOut
	}), [
		disabled,
		delayPressIn,
		delayPressOut,
		delayLongPress,
		onLongPress,
		onPress,
		onPressIn,
		onPressOut,
		rejectResponderTermination
	]));
	var element = import_react.Children.only(props.children);
	var children = [element.props.children];
	var supportedProps = pickProps(props);
	supportedProps.accessibilityDisabled = disabled;
	supportedProps.focusable = !disabled && focusable !== false;
	supportedProps.ref = useMergeRefs$1(forwardedRef, hostRef, element.ref);
	var elementProps = Object.assign(supportedProps, pressEventHandlers);
	return /*#__PURE__*/ import_react.cloneElement(element, elementProps, ...children);
}
var MemoedTouchableWithoutFeedback = /*#__PURE__*/ import_react.memo(/*#__PURE__*/ import_react.forwardRef(TouchableWithoutFeedback));
MemoedTouchableWithoutFeedback.displayName = "TouchableWithoutFeedback";
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/VirtualizedList/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var VirtualizedList_default = VirtualizedList;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/YellowBox/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function YellowBox(props) {
	return /*#__PURE__*/ import_react.createElement(UnimplementedView, props);
}
YellowBox.ignoreWarnings = () => {};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/LogBox/index.js
/**
* Copyright (c) 2016-present, Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var LogBox = {
	ignoreLogs() {},
	ignoreAllLogs() {},
	uninstall() {},
	install() {}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/DeviceEventEmitter/index.js
var DeviceEventEmitter_default = RCTDeviceEventEmitter_default;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/useColorScheme/index.js
/**
* Copyright (c) Nicolas Gallagher.
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
function useColorScheme() {
	var _React$useState = import_react.useState(Appearance.getColorScheme()), colorScheme = _React$useState[0], setColorScheme = _React$useState[1];
	import_react.useEffect(() => {
		function listener(appearance) {
			setColorScheme(appearance.colorScheme);
		}
		return Appearance.addChangeListener(listener).remove;
	});
	return colorScheme;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/useLocaleContext/index.js
/**
* Copyright (c) Nicolas Gallagher.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* 
*/
var useLocaleContext_default = useLocaleContext;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-web@0.21.2_rea_f5518d5b95f79a9309036944c9c286ee/node_modules/react-native-web/dist/exports/useWindowDimensions/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @format
* 
*/
function useWindowDimensions() {
	var _useState = (0, import_react.useState)(() => Dimensions.get("window")), dims = _useState[0], setDims = _useState[1];
	(0, import_react.useEffect)(() => {
		function handleChange(_ref) {
			var window = _ref.window;
			if (window != null) setDims(window);
		}
		Dimensions.addEventListener("change", handleChange);
		setDims(Dimensions.get("window"));
		return () => {
			Dimensions.removeEventListener("change", handleChange);
		};
	}, []);
	return dims;
}
//#endregion
export { AccessibilityInfo, ActivityIndicator, Alert, Animated_default as Animated, AppRegistry, AppState, Appearance, BackHandler, Button, CheckBox, Clipboard, DeviceEventEmitter_default as DeviceEventEmitter, Dimensions, Easing_default as Easing, FlatList_default as FlatList, I18nManager, ImageWithStatics as Image, ImageBackground, InteractionManager, Keyboard, KeyboardAvoidingView, LayoutAnimation_default as LayoutAnimation, Linking_default as Linking, LogBox, Modal, NativeEventEmitter_default as NativeEventEmitter, NativeModules, PanResponder_default as PanResponder, Picker, PixelRatio, Platform, MemoedPressable as Pressable, ProgressBar, RefreshControl, SafeAreaView, ForwardedScrollView as ScrollView, SectionList_default as SectionList, Share, StatusBar, stylesheet as StyleSheet, Switch, Text, TextInput, Touchable, MemoedTouchableHighlight as TouchableHighlight, TouchableNativeFeedback_default as TouchableNativeFeedback, MemoedTouchableOpacity as TouchableOpacity, MemoedTouchableWithoutFeedback as TouchableWithoutFeedback, UIManager, Vibration, View, VirtualizedList_default as VirtualizedList, YellowBox, findNodeHandle, processColor, render, unmountComponentAtNode, createElement as unstable_createElement, useColorScheme, useLocaleContext_default as useLocaleContext, useWindowDimensions };
