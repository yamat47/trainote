The line graph of a measurement over a period: weight over the last month on Weight, the goal as a dashed line.

Pass `points`, the measurement as `x` (a day, as a number from 0) and `y`, drawn in `tint` at `stroke-plot` against the right axis and ending in a dot; `secondary` for a second measurement (body fat), drawn thinner in `secondary-label` against a left axis; `to`, the last day of the plot; and `xLabels`, the dates written under it. Pass `goal` to draw the dashed `red` line at a value of the right axis with its words ("Goal 60.0"). The gridlines are `separator` hairlines at round steps, the axis labels `footnote` in `secondary-label` with tabular figures. Pass `label`, the sentence a screen reader hears instead.

- Do: let a day without a value leave a straight segment in the line; the only dot is the last point, and the number itself lives in a `Stat` above, not on the graph.
- Don't: fill under the line, animate, add a legend, colour up or down, or use red for anything but the goal.
