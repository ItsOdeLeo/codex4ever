/** One label template for the two reset distributions and quota lane. */
export function renderTimelineLaneLabel({id,x,y,width,height=52,title,detail,note='',tooltip='',inline=false},escape) {
  const content=inline ? `<span class="timeline-lane-text">${escape([title,detail,note].filter(Boolean).join(' '))}</span>`
    : `<strong>${escape(title)}</strong><span>${escape(detail)}</span>${note ? `<small class="timeline-lane-note">${escape(note)}</small>` : ''}`;
  return `<div class="timeline-lane-label" data-lane-label="${escape(id)}"${inline ? ' data-lane-inline' : ''} title="${escape(tooltip||[title,detail,note].filter(Boolean).join(' · '))}" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px">${content}</div>`;
}
