/** Size the timeline inside its own panel; the page already allocates the sidebar. */
export function workspaceLayout(availableWidth=1120) {
  const width=Number.isFinite(availableWidth)&&availableWidth>0 ? Math.round(availableWidth) : 1120;
  const panelPadding=width<680 ? 14 : 24;
  return {width,panelPadding,timelineWidth:Math.max(1,width-panelPadding*2-2)};
}
