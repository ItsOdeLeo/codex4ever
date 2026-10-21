/** Reviewed public campaign evidence, independent of short-lived post signals.
 * Day 1 and the announced duration define the calendar range, not an exact
 * promised reset deadline. Source-calendar dates stay in the publisher's zone.
 * New campaigns can be supplied by an archive/MCP caller without code changes. */
export const RESET_CAMPAIGNS = [{
  id: 'codex-28-days-2026-10', name: '28 天改进或 reset',
  announcedAt: '2026-10-04T20:33:43.000Z',
  startsAt: '2026-10-05T07:00:00.000Z',
  endsAt: '2026-11-02T08:00:00.000Z', // Exclusive; Nov 1 includes the DST change.
  timeZone: 'America/Los_Angeles', durationDays: 28,
  sourceUrl: 'https://x.com/thsottiaux/status/2106845241357824205',
  dayOneSourceUrl: 'https://x.com/thsottiaux/status/2107158998495748264',
  archiveUrl: 'https://github.com/zarazhangrui/follow-builders/blob/main/feed-x.json',
  calendarBasis: 'day-one-plus-announced-duration',
  sourceAccess: 'public-post-archive; original X page returned 403'
}];

export function describeResetCampaign(campaign, now) {
  if (!campaign) return null;
  const start = Date.parse(campaign.startsAt), end = Date.parse(campaign.endsAt);
  const announced = Date.parse(campaign.announcedAt), at = Number(now);
  if (![start, end, announced, at].every(Number.isFinite) || end <= start || announced > at)
    throw new Error('campaign 需要有效的公告时间与起止时间，且公告不能晚于当前时间');
  new Intl.DateTimeFormat('en-CA', { timeZone: campaign.timeZone }).format(start);
  return { ...campaign, status: at < start ? 'upcoming' : at < end ? 'active' : 'ended' };
}

export function selectResetCampaign({ campaigns = RESET_CAMPAIGNS, now }) {
  const known = campaigns.filter(campaign => Date.parse(campaign.announcedAt) <= Number(now))
    .map(campaign => describeResetCampaign(campaign, now))
    .sort((a,b) => Date.parse(b.announcedAt)-Date.parse(a.announcedAt));
  return known.find(campaign => campaign.status === 'active')
    ?? known[0] ?? null;
}
