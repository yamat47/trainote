/* @ds-bundle: {"format":4,"namespace":"Trainote","components":[{"name":"Screen"},{"name":"NavBar"},{"name":"TabBar"},{"name":"ListHeader"},{"name":"List"},{"name":"Inset"},{"name":"Group"},{"name":"Row"},{"name":"Mark"},{"name":"Text"},{"name":"Field"},{"name":"Button"},{"name":"Actions"},{"name":"Segmented"},{"name":"Stat"},{"name":"Graph"},{"name":"Week"},{"name":"Bubble"},{"name":"Composer"},{"name":"Icon"}]} */
var Trainote = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// design/src/Screen.tsx
	function Screen({ tone = "plain", tabBar, children }) {
		return /* @__PURE__ */ React.createElement("div", { className: tone === "grouped" ? "tn-screen tn-screen-grouped" : "tn-screen" }, /* @__PURE__ */ React.createElement("main", { className: "tn-screen-content" }, children), tabBar === void 0 ? null : /* @__PURE__ */ React.createElement("div", { className: "tn-screen-tabbar" }, tabBar));
	}
	// design/src/classes.ts
	var classes = (...names) => names.filter(Boolean).join(" ");
	// design/src/Icon.tsx
	function Icon({ name }) {
		return /* @__PURE__ */ React.createElement("i", {
			className: "f7-icons",
			"aria-hidden": "true"
		}, name);
	}
	// design/src/NavBar.tsx
	function NavBar({ title, trailing, back }) {
		return /* @__PURE__ */ React.createElement("header", { className: classes("tn-navbar", back !== void 0 && "tn-navbar-inline") }, back === void 0 ? null : /* @__PURE__ */ React.createElement("button", {
			type: "button",
			className: "tn-navbar-back",
			onClick: back.onClick
		}, /* @__PURE__ */ React.createElement(Icon, { name: "chevron_left" }), back.label), /* @__PURE__ */ React.createElement("h1", { className: "tn-navbar-title" }, title), trailing === void 0 ? null : /* @__PURE__ */ React.createElement("div", { className: "tn-navbar-trailing" }, trailing));
	}
	// design/src/TabBar.tsx
	function TabBar({ items, active, onChange, label = "Sections" }) {
		return /* @__PURE__ */ React.createElement("div", {
			className: "tn-tabbar",
			role: "tablist",
			"aria-label": label
		}, items.map((item) => {
			const selected = item.key === active;
			return /* @__PURE__ */ React.createElement("button", {
				key: item.key,
				type: "button",
				role: "tab",
				className: "tn-tab",
				"aria-selected": selected,
				onClick: () => onChange(item.key)
			}, /* @__PURE__ */ React.createElement(Icon, { name: selected ? item.iconActive : item.icon }), /* @__PURE__ */ React.createElement("span", null, item.label));
		}));
	}
	// design/src/ListHeader.tsx
	function ListHeader({ children }) {
		return /* @__PURE__ */ React.createElement("h2", { className: "tn-list-header" }, children);
	}
	// design/src/List.tsx
	function List({ header, children }) {
		return /* @__PURE__ */ React.createElement("section", { className: "tn-list" }, header === void 0 ? null : /* @__PURE__ */ React.createElement(ListHeader, null, header), children);
	}
	// design/src/Inset.tsx
	function Inset({ header, children }) {
		return /* @__PURE__ */ React.createElement("section", { className: "tn-inset" }, header === void 0 ? null : /* @__PURE__ */ React.createElement(ListHeader, null, header), /* @__PURE__ */ React.createElement("div", { className: "tn-inset-body" }, children));
	}
	// design/src/Group.tsx
	function Group({ header, footer, children }) {
		return /* @__PURE__ */ React.createElement("section", { className: "tn-group" }, header === void 0 ? null : /* @__PURE__ */ React.createElement("h2", { className: "tn-group-header" }, header), /* @__PURE__ */ React.createElement("div", { className: "tn-group-body" }, children), footer === void 0 ? null : /* @__PURE__ */ React.createElement("p", { className: "tn-group-footer" }, footer));
	}
	// design/src/Mark.tsx
	function Mark({ kind }) {
		const slip = kind === "slip";
		return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", {
			className: slip ? "tn-mark tn-mark-slip" : "tn-mark",
			"aria-hidden": "true"
		}, slip ? "−" : "+"), /* @__PURE__ */ React.createElement("span", { className: "tn-sr-only" }, slip ? "Slip" : "Win"));
	}
	// design/src/Row.tsx
	function Row({ kind, tone, sub, preview, error, detail, accessory, muted, onClick, children }) {
		const className = classes("tn-row", kind !== void 0 && "tn-row-with-mark", (muted ?? kind === "slip") && "tn-row-muted", tone === "tint" && "tn-row-tint", onClick !== void 0 && "tn-row-press");
		const content = /* @__PURE__ */ React.createElement(React.Fragment, null, kind === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-mark" }, /* @__PURE__ */ React.createElement(Mark, { kind })), /* @__PURE__ */ React.createElement("span", { className: "tn-row-text" }, children, sub === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-sub" }, sub), preview === void 0 || preview === null ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-sub tn-row-preview" }, preview), error === void 0 ? null : /* @__PURE__ */ React.createElement("output", { className: "tn-row-error" }, error)), detail === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-detail" }, detail), accessory === "disclosure" ? /* @__PURE__ */ React.createElement("span", { className: "tn-row-chevron" }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron_right" })) : null);
		return onClick === void 0 ? /* @__PURE__ */ React.createElement("div", { className }, content) : /* @__PURE__ */ React.createElement("button", {
			type: "button",
			className,
			onClick
		}, content);
	}
	// design/src/Text.tsx
	function Text({ variant, tone = "secondary", children }) {
		const className = `tn-text tn-text-${variant} tn-text-${tone} ${variant}`;
		return tone === "error" ? /* @__PURE__ */ React.createElement("output", { className }, children) : /* @__PURE__ */ React.createElement("p", { className }, children);
	}
	// design/src/Field.tsx
	var INPUT_MODE = {
		numeric: "decimal",
		whole: "numeric"
	};
	function Field({ value, onChange, placeholder, label, ariaLabel, kind = "text", unit, maxLength, disabled }) {
		const shared = {
			className: "tn-field-input",
			value,
			placeholder,
			"aria-label": label === void 0 ? ariaLabel : void 0,
			maxLength,
			disabled,
			onChange: (event) => onChange(event.target.value)
		};
		return /* @__PURE__ */ React.createElement("label", { className: classes("tn-field", (kind === "numeric" || kind === "whole") && "tn-field-numeric") }, label === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-field-label" }, label), kind === "multiline" ? /* @__PURE__ */ React.createElement("span", {
			className: "tn-field-grow",
			"data-value": value
		}, /* @__PURE__ */ React.createElement("textarea", {
			...shared,
			rows: 1
		})) : /* @__PURE__ */ React.createElement("input", {
			...shared,
			type: kind === "date" ? "date" : "text",
			inputMode: INPUT_MODE[kind]
		}), unit === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-field-unit" }, unit));
	}
	// design/src/Button.tsx
	function Button({ variant = "plain", disabled, onClick, children }) {
		return /* @__PURE__ */ React.createElement("button", {
			type: "button",
			className: `tn-btn tn-btn-${variant}`,
			disabled,
			onClick
		}, children);
	}
	// design/src/Actions.tsx
	function Actions({ align = "fill", error, children }) {
		return /* @__PURE__ */ React.createElement("div", { className: align === "end" ? "tn-actions tn-actions-end" : "tn-actions" }, /* @__PURE__ */ React.createElement("div", { className: "tn-actions-row" }, children), error === void 0 ? null : /* @__PURE__ */ React.createElement(Text, {
			variant: "caption-1",
			tone: "error"
		}, error));
	}
	// design/src/Segmented.tsx
	function Segmented({ items, value, onChange, label }) {
		return /* @__PURE__ */ React.createElement("fieldset", { className: "tn-segmented" }, /* @__PURE__ */ React.createElement("legend", { className: "tn-sr-only" }, label), items.map((item) => /* @__PURE__ */ React.createElement("button", {
			key: item.key,
			type: "button",
			className: "tn-segment",
			"aria-pressed": item.key === value,
			onClick: () => onChange(item.key)
		}, item.label)));
	}
	// design/src/Stat.tsx
	function Stat({ value, unit, label, note }) {
		return /* @__PURE__ */ React.createElement("div", { className: "tn-stat" }, /* @__PURE__ */ React.createElement("div", { className: "tn-stat-main" }, /* @__PURE__ */ React.createElement("p", { className: "tn-stat-value" }, value, unit === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-stat-unit" }, unit)), /* @__PURE__ */ React.createElement("p", { className: "tn-stat-label" }, label)), note === void 0 ? null : /* @__PURE__ */ React.createElement("p", { className: "tn-stat-note" }, note));
	}
	// design/src/Graph.tsx
	var WIDTH = 358;
	var HEIGHT = 236;
	var TOP = 20;
	var BOTTOM = 220;
	var RIGHT = 322;
	var LEFT_AXIS = 36;
	function ticks(values) {
		const min = Math.min(...values);
		const max = Math.max(...values);
		const span = Math.max(max - min, 1);
		const mid = (min + max) / 2;
		const raw = span / 4;
		const magnitude = 10 ** Math.floor(Math.log10(raw));
		const unit = raw / magnitude;
		const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * magnitude;
		const lo = Math.floor((mid - span / 2) / step) * step;
		const hi = Math.ceil((mid + span / 2) / step) * step;
		const out = [];
		for (let tick = lo; tick <= hi + step / 2; tick += step) out.push(Number(tick.toFixed(2)));
		return out;
	}
	var scale = (lo, hi, fromPx, toPx) => (value) => fromPx + (value - lo) / (hi - lo) * (toPx - fromPx);
	function axis(values) {
		const marks = ticks(values);
		return {
			ticks: marks,
			y: scale(marks[0] ?? 0, marks.at(-1) ?? 1, BOTTOM, TOP)
		};
	}
	function Graph({ label, points, secondary, to, xLabels, goal }) {
		const left = secondary === void 0 ? 0 : LEFT_AXIS;
		const x = scale(0, to, left, RIGHT);
		const right = axis([...points.map((p) => p.y), ...goal === void 0 ? [] : [goal.y]]);
		const other = secondary === void 0 ? void 0 : axis(secondary.map((p) => p.y));
		const path = (line, y) => line.filter((p) => p.x >= 0 && p.x <= to).map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
		const last = points.findLast((p) => p.x >= 0 && p.x <= to);
		return /* @__PURE__ */ React.createElement("figure", { className: "tn-graph" }, /* @__PURE__ */ React.createElement("svg", {
			viewBox: `0 0 ${String(WIDTH)} ${String(HEIGHT)}`,
			role: "img",
			"aria-label": label
		}, /* @__PURE__ */ React.createElement("g", { className: "tn-graph-grid" }, right.ticks.map((tick) => /* @__PURE__ */ React.createElement("line", {
			key: tick,
			x1: left,
			y1: right.y(tick),
			x2: RIGHT,
			y2: right.y(tick)
		}))), /* @__PURE__ */ React.createElement("g", { className: "tn-graph-axis" }, right.ticks.map((tick) => /* @__PURE__ */ React.createElement("text", {
			key: tick,
			x: 330,
			y: right.y(tick) + 4
		}, tick)), other?.ticks.map((tick) => /* @__PURE__ */ React.createElement("text", {
			key: tick,
			x: left - 8,
			y: other.y(tick) + 4,
			textAnchor: "end"
		}, tick)), xLabels.map((item, i) => /* @__PURE__ */ React.createElement("text", {
			key: item.x,
			x: x(item.x),
			y: 235,
			textAnchor: i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"
		}, item.label))), goal === void 0 ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("line", {
			className: "tn-graph-goal",
			x1: left,
			y1: right.y(goal.y),
			x2: RIGHT,
			y2: right.y(goal.y)
		}), /* @__PURE__ */ React.createElement("text", {
			className: "tn-graph-goal-label",
			x: RIGHT,
			y: right.y(goal.y) - 6,
			textAnchor: "end"
		}, goal.label)), secondary === void 0 || other === void 0 ? null : /* @__PURE__ */ React.createElement("polyline", {
			className: "tn-graph-line tn-graph-line-secondary",
			points: path(secondary, other.y)
		}), /* @__PURE__ */ React.createElement("polyline", {
			className: "tn-graph-line",
			points: path(points, right.y)
		}), last === void 0 ? null : /* @__PURE__ */ React.createElement("circle", {
			className: "tn-graph-point",
			cx: x(last.x),
			cy: right.y(last.y),
			r: "4.5"
		})));
	}
	// design/src/Week.tsx
	var plural = (n, word) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;
	function Week({ days, label = "This week" }) {
		return /* @__PURE__ */ React.createElement("ul", {
			className: "tn-week",
			"aria-label": label
		}, days.map((day) => /* @__PURE__ */ React.createElement("li", {
			key: day.label,
			className: day.today ? "tn-week-day tn-week-today" : "tn-week-day",
			"aria-label": [
				day.label,
				day.wins === 0 ? void 0 : plural(day.wins, "win"),
				day.slips === 0 ? void 0 : plural(day.slips, "slip")
			].filter((part) => part !== void 0).join(", ")
		}, /* @__PURE__ */ React.createElement("span", {
			className: "tn-week-label",
			"aria-hidden": "true"
		}, day.label), /* @__PURE__ */ React.createElement("span", {
			className: "tn-week-wins",
			"aria-hidden": "true"
		}, day.wins === 0 ? "" : `+${String(day.wins)}`), /* @__PURE__ */ React.createElement("span", {
			className: "tn-week-slips",
			"aria-hidden": "true"
		}, day.slips === 0 ? "" : `\u2212${String(day.slips)}`))));
	}
	// design/src/Bubble.tsx
	function Bubble({ from, children }) {
		return /* @__PURE__ */ React.createElement("div", { className: classes("tn-bubble", from === "me" && "tn-bubble-me") }, /* @__PURE__ */ React.createElement("p", { className: "tn-bubble-body" }, children));
	}
	// design/src/Composer.tsx
	function Composer({ value, onChange, onSend, disabled, error, placeholder = "Message", maxLength }) {
		return /* @__PURE__ */ React.createElement("div", { className: "tn-composer" }, error === void 0 ? null : /* @__PURE__ */ React.createElement(Text, {
			variant: "caption-1",
			tone: "error"
		}, error), /* @__PURE__ */ React.createElement("div", { className: "tn-composer-row" }, /* @__PURE__ */ React.createElement("span", {
			className: "tn-composer-field",
			"data-value": value
		}, /* @__PURE__ */ React.createElement("textarea", {
			className: "tn-composer-input",
			rows: 1,
			value,
			placeholder,
			"aria-label": placeholder,
			maxLength,
			disabled,
			onChange: (event) => onChange(event.target.value)
		})), /* @__PURE__ */ React.createElement("button", {
			type: "button",
			className: "tn-composer-send",
			"aria-label": "Send",
			disabled: (disabled ?? false) || value.trim() === "",
			onClick: onSend
		}, /* @__PURE__ */ React.createElement(Icon, { name: "arrow_up_circle_fill" }))));
	}
	exports.Actions = Actions;
	exports.Bubble = Bubble;
	exports.Button = Button;
	exports.Composer = Composer;
	exports.Field = Field;
	exports.Graph = Graph;
	exports.Group = Group;
	exports.Icon = Icon;
	exports.Inset = Inset;
	exports.List = List;
	exports.ListHeader = ListHeader;
	exports.Mark = Mark;
	exports.NavBar = NavBar;
	exports.Row = Row;
	exports.Screen = Screen;
	exports.Segmented = Segmented;
	exports.Stat = Stat;
	exports.TabBar = TabBar;
	exports.Text = Text;
	exports.Week = Week;
	return exports;
})({});
