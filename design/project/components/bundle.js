/* @ds-bundle: {"format":4,"namespace":"Trainote","components":[{"name":"Screen"},{"name":"NavBar"},{"name":"TabBar"},{"name":"ListHeader"},{"name":"List"},{"name":"Inset"},{"name":"Group"},{"name":"Row"},{"name":"Mark"},{"name":"Text"},{"name":"Field"},{"name":"Button"},{"name":"Actions"},{"name":"Stat"},{"name":"Week"},{"name":"Icon"}]} */
var Trainote = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// design/src/Screen.tsx
	function Screen({ tone = "plain", tabBar, children }) {
		return /* @__PURE__ */ React.createElement("div", { className: tone === "grouped" ? "tn-screen tn-screen-grouped" : "tn-screen" }, /* @__PURE__ */ React.createElement("main", { className: "tn-screen-content" }, children), /* @__PURE__ */ React.createElement("div", { className: "tn-screen-tabbar" }, tabBar));
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
	function Row({ kind, tone, sub, error, detail, accessory, muted, onClick, children }) {
		const className = classes("tn-row", kind !== void 0 && "tn-row-with-mark", (muted ?? kind === "slip") && "tn-row-muted", tone === "tint" && "tn-row-tint", onClick !== void 0 && "tn-row-press");
		const content = /* @__PURE__ */ React.createElement(React.Fragment, null, kind === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-mark" }, /* @__PURE__ */ React.createElement(Mark, { kind })), /* @__PURE__ */ React.createElement("span", { className: "tn-row-text" }, children, sub === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-sub" }, sub), error === void 0 ? null : /* @__PURE__ */ React.createElement("output", { className: "tn-row-error" }, error)), detail === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-row-detail" }, detail), accessory === "disclosure" ? /* @__PURE__ */ React.createElement("span", { className: "tn-row-chevron" }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron_right" })) : null);
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
	function Field({ value, onChange, placeholder, label, ariaLabel, multiline = false, numeric = false, unit, maxLength, disabled }) {
		const shared = {
			className: "tn-field-input",
			value,
			placeholder,
			"aria-label": label === void 0 ? ariaLabel : void 0,
			maxLength,
			disabled,
			onChange: (event) => onChange(event.target.value)
		};
		return /* @__PURE__ */ React.createElement("label", { className: classes("tn-field", numeric && "tn-field-numeric") }, label === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-field-label" }, label), multiline ? /* @__PURE__ */ React.createElement("span", {
			className: "tn-field-grow",
			"data-value": value
		}, /* @__PURE__ */ React.createElement("textarea", {
			...shared,
			rows: 1
		})) : /* @__PURE__ */ React.createElement("input", {
			...shared,
			type: "text",
			inputMode: numeric ? "decimal" : void 0
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
	// design/src/Stat.tsx
	function Stat({ value, unit, label, note }) {
		return /* @__PURE__ */ React.createElement("div", { className: "tn-stat" }, /* @__PURE__ */ React.createElement("div", { className: "tn-stat-main" }, /* @__PURE__ */ React.createElement("p", { className: "tn-stat-value" }, value, unit === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: "tn-stat-unit" }, unit)), /* @__PURE__ */ React.createElement("p", { className: "tn-stat-label" }, label)), note === void 0 ? null : /* @__PURE__ */ React.createElement("p", { className: "tn-stat-note" }, note));
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
	exports.Actions = Actions;
	exports.Button = Button;
	exports.Field = Field;
	exports.Group = Group;
	exports.Icon = Icon;
	exports.Inset = Inset;
	exports.List = List;
	exports.ListHeader = ListHeader;
	exports.Mark = Mark;
	exports.NavBar = NavBar;
	exports.Row = Row;
	exports.Screen = Screen;
	exports.Stat = Stat;
	exports.TabBar = TabBar;
	exports.Text = Text;
	exports.Week = Week;
	return exports;
})({});
