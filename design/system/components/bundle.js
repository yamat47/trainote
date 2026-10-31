/* @ds-bundle: {"format":4,"namespace":"Trainote","components":[{"name":"NavBar"},{"name":"TabBar"},{"name":"Row"},{"name":"Week"},{"name":"ListHeader"},{"name":"Group"},{"name":"Field"},{"name":"Mark"},{"name":"Stat"},{"name":"Button"},{"name":"Segmented"},{"name":"Bubble"}]} */
(function () {
  function h() { var R = window.React; return R.createElement.apply(R, arguments); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function icon(name) { return h('i', { className: 'f7-icons', 'aria-hidden': 'true' }, name); }

  function NavBar(props) {
    var trailing = props.trailing != null ? props.trailing : props.children;
    return h('header', { className: 'tn-navbar' },
      h('h1', { className: 'tn-navbar-title' }, props.title),
      trailing ? h('div', { className: 'tn-navbar-trailing' }, trailing) : null);
  }

  function TabBar(props) {
    var items = props.items || [];
    return h('nav', { className: 'tn-tabbar', role: 'tablist', 'aria-label': props.label || 'Sections' },
      items.map(function (item) {
        var selected = item.key === props.active;
        return h('button', {
          key: item.key, type: 'button', role: 'tab', className: 'tn-tab',
          'aria-selected': selected ? 'true' : 'false',
          onClick: function () { if (props.onChange) props.onChange(item.key); }
        }, icon(selected ? (item.iconActive || item.icon) : item.icon), h('span', null, item.label));
      }));
  }

  function Row(props) {
    var pressable = typeof props.onClick === 'function';
    var mark = props.mark != null ? props.mark : (props.kind ? h(Mark, { kind: props.kind }) : null);
    var muted = props.muted != null ? props.muted : props.kind === 'slip';
    return h(pressable ? 'button' : 'div', {
      type: pressable ? 'button' : undefined,
      className: cx('tn-row', mark != null && 'tn-row-with-mark', muted && 'tn-row-muted', props.tone === 'tint' && 'tn-row-tint', pressable && 'tn-row-press'),
      onClick: props.onClick
    },
      mark != null ? h('span', { className: 'tn-row-mark' }, mark) : null,
      h('span', { className: 'tn-row-text' }, props.children,
        props.sub != null ? h('span', { className: 'tn-row-sub' }, props.sub) : null),
      props.detail != null ? h('span', { className: 'tn-row-detail' }, props.detail) : null,
      props.accessory === 'disclosure' ? h('span', { className: 'tn-row-chevron' }, icon('chevron_right')) : null);
  }

  function Week(props) {
    var days = props.days || [];
    return h('div', { className: 'tn-week', role: 'list', 'aria-label': props.label || 'This week' },
      days.map(function (d, i) {
        return h('div', { key: i, role: 'listitem', className: cx('tn-week-day', d.today && 'tn-week-today'),
          'aria-label': d.label + (d.wins ? ', ' + d.wins + (d.wins === 1 ? ' win' : ' wins') : '') + (d.slips ? ', ' + d.slips + (d.slips === 1 ? ' slip' : ' slips') : '') },
          h('span', { className: 'tn-week-label', 'aria-hidden': 'true' }, d.label),
          h('span', { className: 'tn-week-wins', 'aria-hidden': 'true' }, d.wins ? '+' + d.wins : ''),
          h('span', { className: 'tn-week-slips', 'aria-hidden': 'true' }, d.slips ? '\u2212' + d.slips : ''));
      }));
  }

  function ListHeader(props) {
    return h('h2', { className: 'tn-list-header' }, props.children);
  }

  function Group(props) {
    return h('section', { className: 'tn-group' },
      props.header ? h('h2', { className: 'tn-group-header' }, props.header) : null,
      h('div', { className: 'tn-group-body' }, props.children),
      props.footer ? h('p', { className: 'tn-group-footer' }, props.footer) : null);
  }

  function Field(props) {
    var multiline = !!props.multiline;
    var attrs = {
      className: 'tn-field-input',
      placeholder: props.placeholder,
      'aria-label': props.ariaLabel || props['aria-label'] || props.label,
      onChange: function (e) { if (props.onChange) props.onChange(e.target.value); }
    };
    if (props.value !== undefined) attrs.value = props.value; else attrs.defaultValue = props.defaultValue;
    if (multiline) attrs.rows = props.rows || 1; else attrs.type = 'text';
    if (props.numeric) attrs.inputMode = 'decimal';
    return h('label', { className: cx('tn-field', props.numeric && 'tn-field-numeric') },
      props.label ? h('span', { className: 'tn-field-label' }, props.label) : null,
      h(multiline ? 'textarea' : 'input', attrs),
      props.unit ? h('span', { className: 'tn-field-unit' }, props.unit) : null);
  }

  function Mark(props) {
    var slip = props.kind === 'slip';
    return h('span', { className: cx('tn-mark', slip && 'tn-mark-slip'), role: 'img', 'aria-label': slip ? 'Slip' : 'Win' },
      slip ? '−' : '+');
  }

  function Stat(props) {
    return h('div', { className: 'tn-stat' },
      h('div', { className: 'tn-stat-value' }, props.value, props.unit ? h('span', { className: 'tn-stat-unit' }, props.unit) : null),
      h('div', { className: 'tn-stat-label' }, props.label));
  }

  function Button(props) {
    var rest = {};
    for (var k in props) if (k !== 'variant' && k !== 'bold' && k !== 'block' && k !== 'className' && k !== 'children') rest[k] = props[k];
    rest.type = rest.type || 'button';
    rest.className = cx('tn-btn', 'tn-btn-' + (props.variant || 'plain'), props.bold && 'tn-btn-bold', props.block && 'tn-btn-block', props.className);
    return h('button', rest, props.children);
  }

  function Segmented(props) {
    var items = props.items || [];
    return h('div', { className: 'tn-segmented', role: 'group', 'aria-label': props.label },
      items.map(function (item) {
        var selected = item.key === props.value;
        return h('button', {
          key: item.key, type: 'button', className: 'tn-segment', 'aria-pressed': selected ? 'true' : 'false',
          onClick: function () { if (props.onChange) props.onChange(item.key); }
        }, item.label);
      }));
  }

  function Bubble(props) {
    var me = props.from === 'me';
    return h('div', { className: cx('tn-bubble-row', me && 'tn-bubble-row-me') },
      h('div', { className: cx('tn-bubble', me ? 'tn-bubble-me' : 'tn-bubble-coach') }, props.children));
  }

  window.Trainote = Object.assign(window.Trainote || {}, {
    NavBar: NavBar, TabBar: TabBar, Row: Row, Week: Week, ListHeader: ListHeader, Group: Group, Field: Field, Mark: Mark, Stat: Stat, Button: Button, Segmented: Segmented, Bubble: Bubble
  });
})();
