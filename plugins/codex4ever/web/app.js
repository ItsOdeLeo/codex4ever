// src/ui-language.js
var LANGUAGE_STORAGE_KEY = "codex4ever-language";
var DEFAULT_LANGUAGE = "en";
function supportedLanguage(value) {
  if (typeof value !== "string") return null;
  if (/^zh(?:-|$)/i.test(value)) return "zh-CN";
  if (/^en(?:-|$)/i.test(value)) return "en";
  return null;
}
function chooseLanguage({ saved, browserLanguages = [], browserLanguage } = {}) {
  return supportedLanguage(saved) ?? (Array.isArray(browserLanguages) ? browserLanguages : []).map(supportedLanguage).find(Boolean) ?? supportedLanguage(browserLanguage) ?? DEFAULT_LANGUAGE;
}
var uiLocale = (language2) => supportedLanguage(language2) === "zh-CN" ? "zh-CN" : "en-GB";
var english = {
  "\u5EFA\u8BAE\u7B56\u7565": "Suggested plan",
  "\u67E5\u770B\u5F53\u524D\u7528\u91CF\u63A8\u6F14": "Preview selected usage",
  "\u8BA1\u7B97\u5EFA\u8BAE\u7B56\u7565": "Find suggested plan",
  "\u56DE\u5230\u5EFA\u8BAE\u7B56\u7565": "Back to suggested plan",
  "\u5148\u7528 {daily}% / \u5929": "Use {daily}% / day",
  "\u5148\u7B49\u5F85\u81F3 {time}": "Wait until {time}",
  "\uFF1B\u82E5\u5230 {time} \u4ECD\u672A\u91CD\u7F6E\uFF0C\u5148\u7B49\u5F85\u8865\u7ED9": "; if no reset by {time}, wait for a refill",
  "\u671F\u9650\u524D\u4F7F\u7528\u5907\u7528\uFF1A{time}": "Use banked reset before its deadline: {time}",
  "\uFF1B\u82E5\u5230 {time} \u4ECD\u672A\u91CD\u7F6E\uFF0C\u6539\u4E3A {daily}% / \u5929": "; if no reset by {time}, use {daily}% / day",
  "\u4ECD\u672A\u91CD\u7F6E\u4E14\u8017\u5C3D\uFF0C\u518D\u7528\u5907\u7528\uFF1A{time}": "Banked reset only if still depleted without a reset: {time}",
  "\u65B9\u6848\u6BD4\u8F83 \xB7 \u672A\u6765 {days} \u5929": "Compare plans \xB7 Next {days} days",
  "\u65B9\u6848": "Plan",
  "\u9884\u8BA1\u505C\u7528": "Expected pause",
  "\u9700\u8981\u5907\u7528": "Chance of using a banked reset",
  "\u4FDD\u6301\u6240\u9009\u7528\u91CF": "Keep selected usage",
  "\u540C\u4E00\u6279\u91CD\u7F6E\u60C5\u666F\uFF1B\u7EFC\u5408\u5B8C\u6210\u7528\u91CF\u3001\u505C\u7528\u3001\u504F\u79BB\u76EE\u6807\u548C\u5269\u4F59\u8D44\u6E90\u3002\u9884\u6D4B\u672A\u6821\u51C6\u3002": "Same reset scenarios; balances completed usage, pauses, deviation and remaining resources. Forecast uncalibrated.",
  "\u82E5\u59CB\u7EC8\u6CA1\u6709\u989D\u5916\u91CD\u7F6E": "If no extra reset occurs",
  "Codex4ever \xB7 \u7528\u91CF\u7B56\u7565\u5EFA\u8BAE": "Codex4ever \xB7 Usage planner",
  "\u89C4\u5212\u63A5\u4E0B\u6765\u600E\u4E48\u7528\uFF0C\u4EC0\u4E48\u65F6\u5019\u8865\u7ED9\u3002": "Plan your usage and your next reset.",
  "OpenAI Codex \u7684\u975E\u5B98\u65B9\u53EF\u89C6\u5316\u7528\u91CF\u89C4\u5212\u5DE5\u5177\u3002\u4E0E OpenAI \u65E0\u96B6\u5C5E\u5173\u7CFB\u3002": "Unofficial visual usage planner for OpenAI Codex. Not affiliated with OpenAI.",
  "\u2605 \u5728 GitHub \u70B9\u4E2A Star": "\u2605 Star on GitHub",
  "\u5728 X \u5173\u6CE8\u6211": "Follow on X",
  "\u72B6\u6001\u4E0E\u9884\u6D4B": "State and forecast",
  "\u7B97\u6CD5\u8F93\u5165": "Usage inputs",
  "\u9884\u6D4B\u4F9D\u636E": "Forecast evidence",
  "\u7B97\u6CD5\u8F93\u51FA": "Usage plan",
  "\u8BA1\u7B97\u7B56\u7565\u5EFA\u8BAE": "Calculate plan",
  "\u63A5\u4E0B\u6765\u600E\u4E48\u7528": "Your next few days",
  "\u66F4\u65B0\u6570\u636E": "Update data",
  "\u91C7\u7528\u8F93\u5165\u4FEE\u6539\u5E76\u5237\u65B0\u91CD\u7F6E\u8BC1\u636E": "Apply input changes and refresh reset evidence",
  "\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u66F4\u65B0\u6570\u636E": "Inputs changed. Update data to apply.",
  "\u5373\u65F6\u66F4\u65B0": "Updates instantly",
  "\u81EA\u5B9A\u4E49\u7528\u91CF": "Customize usage",
  "\u5982\u679C\u4F60\u559C\u6B22\u8FD9\u4E2A\u4F5C\u54C1\uFF0C\u6B22\u8FCE\u5728 X \u4E0A\u5173\u6CE8\u6211": "If you like this work, follow me on X",
  "GitHub \u5F00\u6E90": "Open source on GitHub",
  "Reset \u6982\u7387": "Reset probability",
  "\u7B2C\u4E8C\u6B21 reset \u6982\u7387": "Second reset probability",
  "\u4E0B\u6B21\u989D\u5916 reset": "Next extra reset",
  "\u672A\u6765 48 \u5C0F\u65F6": "Next 48h",
  "\u4FEE\u6539\u989D\u5EA6": "Edit quota",
  "\u70B9\u51FB\u300C\u8BA1\u7B97\u7B56\u7565\u300D\u67E5\u770B\u7ED3\u679C\u3002": "Calculate a plan to see your timeline.",
  "\u91CD\u7F6E\u6570\u636E\u6765\u6E90": "Reset data",
  "\u672C\u5730\u4F30\u7B97 \xB7 \u4E0D\u6267\u884C\u5151\u6362 \xB7 \u7528\u91CF\u6216\u91CD\u7F6E\u53D8\u5316\u540E\u91CD\u65B0\u8BA1\u7B97": "Local estimate \xB7 No resets redeemed \xB7 Recalculate after usage or resets change",
  "\u8BED\u8A00": "Language",
  "\u5907\u7528 reset \xB7 {count} \u4E2A": "Banked resets \xB7 {count}",
  "\u5F53\u524D\u72B6\u6001": "Current state",
  "\u672C\u5468\u989D\u5EA6\u8FD8\u5269\u591A\u5C11 %": "Weekly quota remaining %",
  "\u6B63\u5E38\u5237\u65B0\u8FD8\u6709": "Normal refresh in",
  "\u6B63\u5E38\u5237\u65B0\u5269\u4F59\u5929\u6570": "Days until normal refresh",
  "\u6B63\u5E38\u5237\u65B0\u5269\u4F59\u5C0F\u65F6": "Hours until normal refresh",
  "\u5929": "d",
  "\u5C0F\u65F6": "h",
  "\u51CF\u5C11{label}": "Decrease {label}",
  "\u589E\u52A0{label}": "Increase {label}",
  "\u6682\u65E0\u5907\u7528 reset": "No banked resets",
  "\uFF0B \u6DFB\u52A0\u65E5\u671F": "+ Add date",
  "\u6536\u8D77\u65E5\u5386": "Close calendar",
  "\uFF0C\u5907\u7528 reset \u5230\u671F\u65E5": ", banked reset expiry",
  "\u79FB\u9664\u5907\u7528 reset {date}": "Remove banked reset {date}",
  "\u4E0A\u4E2A\u6708": "Previous month",
  "\u4E0B\u4E2A\u6708": "Next month",
  "{month}\u5907\u7528 reset \u5230\u671F\u65E5\u5386": "Banked reset expiry calendar: {month}",
  "\u70B9\u65E5\u671F\u6DFB\u52A0\u6216\u53D6\u6D88\uFF1B\u540C\u4E00\u5929\u6700\u591A\u4E00\u4E2A\uFF0C\u5230\u671F\u6309\u5F53\u5929\u7ED3\u675F\u4F30\u7B97\u3002": "Select dates to add or remove. One reset per date; expiry is estimated at the end of that day.",
  "\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u8BA1\u7B97": "Inputs changed. Recalculate your plan.",
  "\u66F4\u65B0\u91CD\u7F6E\u8BC1\u636E\u2026": "Updating reset evidence\u2026",
  "\u5DF2\u8BA1\u7B97": "Calculated",
  "\u8BF7\u68C0\u67E5\u8F93\u5165": "Check your inputs",
  "\u6700\u591A\u9009\u62E9 8 \u4E2A\u5907\u7528 reset \u65E5\u671F": "Choose up to 8 banked reset dates",
  "\u989D\u5916\u91CD\u7F6E\u9884\u6D4B": "Extra reset forecast",
  " \xB7 48\u5C0F\u65F6 {percent}%": " \xB7 48h {percent}%",
  "\u5DF2\u5F00\u542F": "On",
  "\u5DF2\u5173\u95ED": "Off",
  "\u7528\u91CF\u8BA1\u5212": "Usage plan",
  "\u5F53\u524D\u65E5\u5747\u6D88\u8017 {daily}%": "Current daily usage {daily}%",
  "\u672C\u5468\u5269 {remaining}% \xB7 \u5237\u65B0\u5269 {time}": "{remaining}% left \xB7 Refresh in {time}",
  "{days}\u5929 {hours}\u5C0F\u65F6": "{days}d {hours}h",
  "{used}% \xF7 {elapsed}\u5C0F\u65F6 \xD7 24": "{used}% \xF7 {elapsed}h \xD7 24",
  "\u6CBF\u7528\u4E0A\u6B21\u89C2\u6D4B\uFF0C\u672C\u8F6E\u6682\u4E0D\u8DB3\u4EE5\u4F30\u7B97": "Using the previous observation; this cycle has too little usage to estimate a rate.",
  "\u7528\u91CF\u4E0E\u91CD\u7F6E \xB7 \u6BCF\u5929\u4E00\u683C": "Usage and resets \xB7 One column per day",
  "\u8BA1\u7B97\u4F9D\u636E\u4E0E\u5047\u8BBE": "Calculation details and assumptions",
  "\u5B9E\u65F6\u8BB0\u5F55 \xB7 \u4E0A\u6B21\u516C\u5F00\u91CD\u7F6E {days} \u5929\u524D": "Live history \xB7 Last public reset {days} days ago",
  "\u7F13\u5B58 \xB7 \u6570\u636E\u622A\u81F3 {date}": "Cached \xB7 Data through {date}",
  " \xB7 X \u56DE\u590D\u6682\u7F3A": " \xB7 X replies unavailable",
  " \xB7 LLM \u5206\u6790\u5E16\u5B50": " \xB7 Posts analysed by LLM",
  "\u9884\u6D4B\u6570\u636E\u6682\u4E0D\u53EF\u7528": "Forecast unavailable",
  "\u5386\u53F2\u6570\u636E\u52A0\u8F7D\u5931\u8D25\uFF0C\u6682\u4E0D\u9884\u6D4B": "Reset history could not be loaded. Forecast unavailable.",
  "\u5386\u53F2\u6570\u636E\u5DF2\u8FC7\u671F\uFF0C\u6682\u4E0D\u9884\u6D4B": "Reset history is out of date. Forecast unavailable.",
  "\u672C\u8F6E\u8FD8\u6CA1\u6709\u53EF\u8BA1\u7B97\u7684\u5E73\u5747\u6D88\u8017\uFF0C\u6682\u65F6\u65E0\u6CD5\u4F30\u8BA1\u7528\u5B8C\u65E5\u671F\u3002": "There is not enough usage in this cycle to estimate a daily rate or depletion time.",
  "\u6B63\u5E38\u5237\u65B0\u9700\u4F4D\u4E8E\u672A\u6765\u4E00\u5468\u5185": "Normal refresh must be within the next seven days.",
  "\u5907\u7528 reset \u8BF7\u9009\u62E9\u6709\u6548\u5230\u671F\u65E5\u671F": "Choose a valid expiry date for each banked reset.",
  "\u5907\u7528 reset \u5230\u671F\u65E5\u671F\u65E0\u6548": "A banked reset expiry date is invalid.",
  "\u5907\u7528 reset \u6700\u591A 8 \u4E2A\uFF0C\u540C\u4E00\u5929\u6700\u591A\u4E00\u4E2A": "Choose up to 8 banked resets, one per date.",
  "\u8BF7\u68C0\u67E5\u5269\u4F59\u989D\u5EA6\u3001\u5237\u65B0\u65F6\u95F4\u548C\u5907\u7528\u5230\u671F\u65E5\u671F\u3002": "Check the remaining quota, refresh time and banked reset expiry dates.",
  "\u5468\u989D\u5EA6\u5E94\u4E3A 0\u2013100 \u4E4B\u95F4\u7684\u6570\u5B57": "Weekly quota remaining must be a number from 0 to 100.",
  "\u5237\u65B0\u5269\u4F59\u5929\u6570\u5E94\u4E3A 0\u20137 \u4E4B\u95F4\u7684\u6574\u6570": "Days until refresh must be a whole number from 0 to 7.",
  "\u5237\u65B0\u5269\u4F59\u5C0F\u65F6\u5E94\u4E3A 0\u201323 \u4E4B\u95F4\u7684\u6574\u6570": "Hours until refresh must be a whole number from 0 to 23.",
  "\u5907\u7528 reset {date} \u5DF2\u8FC7\u671F": "Banked reset {date} has expired.",
  "\u5F53\u524D\u7528\u91CF": "Current",
  "\u52A0\u91CF {percent}%": "+{percent}%",
  "{label}\uFF0C\u65E5\u5747\u6D88\u8017 {daily}% \u5468\u989D\u5EA6": "{label}; daily usage {daily}% of weekly quota",
  " / \u5929": " / day",
  "\u5F53\u524D\u9636\u6BB5\u7528\u91CF": "Current phase usage",
  "\u7B2C{count}\u6BB5\u7528\u91CF": "Phase {count} usage",
  "\u65E5\u5747\u7528\u91CF": "Daily usage",
  "\u5EFA\u8BAE\u7528\u91CF": "Suggested usage",
  "\u5EFA\u8BAE": "Suggested",
  "\u7528\u91CF": "Usage",
  "\u5EFA\u8BAE\u7528\u91CF / \u5929": "Suggested usage / day",
  "\u5EFA\u8BAE / \u5929": "Suggested / day",
  "\u7528\u91CF / \u5929": "Usage / day",
  "\u91CD\u7F6E\u6982\u7387 \xB7 \u622A\u81F3": "Reset chance \xB7 by",
  "\u9996\u6B21\u989D\u5916\u91CD\u7F6E": "First extra reset",
  "\u7B2C\u4E8C\u6B21\u989D\u5916\u91CD\u7F6E": "Second extra reset",
  "\u7528\u91CF\u7B56\u7565": "Usage strategy",
  "\u4FDD\u6301\u8282\u594F": "Keep pace",
  "\u4E0D\u6D6A\u8D39\u989D\u5EA6": "Use it all",
  "\u6309\u5F53\u524D\u901F\u5EA6\u7528\uFF0C\u770B\u4EC0\u4E48\u65F6\u5019\u7528\u5B8C": "Your current pace: see when quota runs out",
  "\u5C3D\u91CF\u4E00\u76F4\u6709\u989D\u5EA6\uFF0C\u5FC5\u8981\u65F6\u653E\u6162": "Stay available, slowing down if needed",
  "\u5728\u4E0B\u6B21\u8865\u6EE1\u524D\u521A\u597D\u7528\u5B8C": "Empty quota just before the next refill",
  "\u5468\u672B\u4F11\u606F\uFF0C\u989D\u5EA6\u5206\u7ED9\u5DE5\u4F5C\u65E5": "Rest on weekends, spread over weekdays",
  "\u4F18\u5148\u5728\u5468\u672B\u7528\u5B8C\u989D\u5EA6": "Use quota mainly on weekends",
  "\u4FDD\u6301\u53EF\u7528": "Keep available",
  "\u89C4\u5212\u503E\u5411": "Planning preference",
  "\u7A33\u59A5": "Cautious",
  "\u4E50\u89C2": "Optimistic",
  "\u4E50\u89C2\u8BA1\u5165\u9884\u6D4B\u7684 reset\uFF0C\u7A33\u59A5\u4E0D\u8BA1\u5165\uFF1B\u90FD\u9884\u7559\u7EA6 {buffer}%\u3002": "Optimistic counts predicted resets, cautious does not; both keep about {buffer}% in reserve.",
  "\u68C0\u67E5\u65F6\u63D0\u9192\uFF1A\u5F00\u542F": "Alerts on checks: On",
  "\u68C0\u67E5\u65F6\u63D0\u9192\uFF1A\u5173\u95ED": "Alerts on checks: Off",
  "\u6309\u5F53\u524D\u7528\u91CF\uFF0C{time} \u8017\u5C3D\u3002": "At current usage, depletion at {time}.",
  "\u5F53\u524D\u7528\u91CF\u65E0\u6CD5\u4FDD\u7559\u76EE\u6807\u4F59\u91CF\u3002": "Current usage would use the reserved margin.",
  "\u82E5 {time} \u4ECD\u672A reset\uFF1A\u6539\u4E3A {daily}% / \u5929\u3002": "If no reset by {time}: use {daily}% / day.",
  "\u82E5\u4ECD\u672A\u989D\u5916 reset": "If still no extra reset",
  "\u5468\u672B\u4E0D\u4F7F\u7528": "Weekdays only",
  "\u5468\u672B\u96C6\u4E2D\u4F7F\u7528": "Weekend focus",
  "\u989D\u5916\u91CD\u7F6E\u6982\u7387": "Reset chance",
  "\u622A\u6B62\u65F6\u95F4": "By",
  "\u81F3\u5C11\u4E00\u6B21 \xB7 \u622A\u81F3": "At least one \xB7 by",
  "\u4FDD\u6301\u5F53\u524D\u7528\u91CF": "Keep current usage",
  "\u81EA\u9009\u7528\u91CF": "Selected usage",
  "\u6CBF\u7528\u5DF2\u9009\u7528\u91CF": "Continue selected usage",
  "\u6682\u505C": "Paused",
  "\u5EFA\u8BAE {daily}% / \u5929": "Suggested {daily}% / day",
  "{daily}% / \u5929": "{daily}% / day",
  "\u989D\u5916\u91CD\u7F6E\u6982\u7387\uFF1A{percent}%": "Reset chance: {percent}%",
  "{time}\u4E4B\u524D": "by {time}",
  "\u81F3\u5C11\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%": "At least one extra reset: {percent}%",
  "\u6D88\u8017": "Consumption",
  "\u6BCF\u5468\u603B\u989D\u5EA6 % / \u5929": "% of weekly quota / day",
  "\u9996\u6B21\u91CD\u7F6E": "1st reset",
  "\u7B2C\u4E8C\u6B21\u91CD\u7F6E": "2nd reset",
  "\u65F6\u95F4\u5206\u5E03": "Time distribution",
  "\u9996\u6B21\u989D\u5916\u91CD\u7F6E\u9884\u6D4B": "First extra reset prediction",
  "\u7B2C\u4E8C\u6B21\u989D\u5916\u91CD\u7F6E\u9884\u6D4B": "Second extra reset prediction",
  "\u6982\u7387\u5BC6\u5EA6": "Probability density",
  "\u4EE5\u9996\u6B21\u53D1\u751F\u4E3A\u524D\u63D0": "Given 1st reset",
  "\u5269\u4F59\u989D\u5EA6": "Quota remaining",
  "\u6BCF\u5468\u989D\u5EA6 % / \u5929": "% quota / day",
  "\u6BCF\u5468\u989D\u5EA6 %": "% quota",
  "\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u523B\u53D1\u751F\u4E3A\u6761\u4EF6\u3002": "Conditional on the first reset at its marker. ",
  "\u5230\u671F\u524D reset\uFF1A{percent}%": "Reset before expiry: {percent}%",
  "\u7528\u5907\u7528\u524D reset\uFF1A{percent}%": "Reset before backup: {percent}%",
  "\u5237\u65B0\u524D reset\uFF1A{percent}%": "Reset before refresh: {percent}%",
  "\u9884\u6D4B\u70B9\u524D reset\uFF1A{percent}%": "Reset by marker: {percent}%",
  "\u672C\u6BB5 reset\uFF1A{percent}%": "Reset this phase: {percent}%",
  "\u7B49\u5F85\u5237\u65B0": "Wait for refresh",
  "\u5EFA\u8BAE\u65E5\u5747\u6D88\u8017 {daily}% \u989D\u5EA6": "Suggested: {daily}% / day",
  "\u65E5\u5747\u6D88\u8017 {daily}% \u989D\u5EA6": "Daily usage: {daily}% of quota",
  "\u6CBF\u7528\u4E0A\u4E00\u6BB5\u7528\u91CF": "Use the previous phase rate",
  "\u6062\u590D\u672C\u6BB5\u81EA\u52A8\u89C4\u5212": "Restore automatic planning for this phase",
  "\u82E5\u4E24\u5929\u540E\u4ECD\u672A\u989D\u5916 reset": "If no extra reset after two days",
  "\u9009\u62E9\u4F7F\u7528\u8FD9\u4E2A\u5907\u7528 reset\uFF0C\u8054\u52A8\u89C4\u5212\u7528\u91CF": "Use this banked reset and update the plan",
  "\u6539\u4E3A\u4FDD\u7559\u8FD9\u4E2A\u5907\u7528 reset\uFF0C\u91CD\u65B0\u89C4\u5212": "Keep this banked reset and update the plan",
  "\u9009\u62E9\u8FD9\u6761\u5206\u652F\uFF0C\u91CD\u65B0\u89C4\u5212\u540E\u7EED": "Choose this branch and update the plan",
  "\u63A8\u8350": "Suggested",
  "\u5907\u7528\u5230\u671F\u524D": "Before bank expiry",
  "\u7528\u5907\u7528\u524D": "Before using a banked reset",
  "\u6B63\u5E38\u5237\u65B0\u524D": "Before normal refresh",
  "\u9884\u6D4B\u70B9\u524D": "Before the forecast marker",
  "\u672C\u6BB5": "This phase",
  "{boundary}\u518D reset\uFF1A{percent}%": "{boundary}: another reset {percent}%",
  "\u622A\u81F3 {time}\uFF1B\u4EE5\u672C\u6BB5\u5F00\u59CB\u524D\u672A\u518D\u53D1\u751F\u989D\u5916reset\u4E3A\u6761\u4EF6{renewal}": "By {time}; conditional on no further reset before this phase{renewal}",
  "\uFF0C\u4ECE\u6700\u8FD1\u9009\u62E9\u7684\u989D\u5916reset\u91CD\u65B0\u8BA1\u65F6": "; the clock restarts at the latest assumed reset",
  "\u9996\u6B21": "First",
  "\u7B2C\u4E8C\u6B21": "Second",
  "\u8BA1\u5165\u9996\u6B21 reset": "Count first reset",
  "\u8BA1\u5165\u7B2C\u4E8C\u6B21 reset": "Count second reset",
  "\u8BA1\u5165\u4E24\u6B21 reset": "Count both resets",
  "\u82E5\u8017\u5C3D\uFF0C\u7528\u5907\u7528": "Banked reset if depleted",
  "\u672A\u518D reset\uFF1A{percent}%": "No further reset: {percent}%",
  "\u5DF2\u8BA1\u5165\u9996\u6B21 reset": "First reset counted",
  "\u5DF2\u8BA1\u5165\u7B2C\u4E8C\u6B21 reset": "Second reset counted",
  "\u540C\u65F6\u5047\u8BBE\u9996\u6B21\u53D1\u751F": "Also assumes the first reset",
  "\u4E0D\u8BA1\u5165": "Don't count",
  "\u53D6\u6D88\u7B2C\u4E8C\u6B21\u5047\u8BBE\uFF0C\u4FDD\u7559\u9996\u6B21": "Cancel the second assumption; keep the first",
  "\u53D6\u6D88\u9996\u6B21\u53CA\u540E\u7EE7\u5047\u8BBE": "Cancel the first and subsequent assumptions",
  "\u5047\u8BBE\u4E24\u6B21\u5747\u53D1\u5E03\uFF0C\u8BA1\u7B97\u5404\u6BB5\u7528\u91CF": "Count both resets and calculate each phase",
  "\u8BA1\u5165\u9996\u6B21 reset\uFF0C\u8BA1\u7B97\u5404\u6BB5\u7528\u91CF": "Count the first reset and calculate each phase",
  "\u6700\u53EF\u80FD": "likely",
  "\u7D2F\u8BA1": "Cumulative",
  "\u8303\u56F4\u5916 {percent}%": "Beyond view {percent}%",
  "\u89C4\u5212\u65F6\u523B": "planned",
  "\u6807\u7EBF\u662F\u89C4\u5212\u8BA1\u5165\u8FD9\u6B21 reset \u7684\u4FDD\u5B88\u65F6\u523B\uFF1A\u6B63\u5E38\u5237\u65B0\u524D\u53EF\u80FD\u53D1\u751F\u7684\u90E8\u5206\uFF0C\u6709 75% \u5728\u6B64\u4E4B\u524D\u3002": "The line marks the conservative time the plan counts this reset: 75% of its chance before the normal refresh falls before it.",
  "\u989D\u5916 reset": "extra reset",
  "\u5047\u8BBE\u9996\u6B21\u53D1\u751F": "assuming the first occurs",
  "\u6982\u7387\u5206\u5E03": "distribution",
  "\u9996\u6B21\u53D1\u751F\u540E": "after the first",
  "\u7B2C\u4E8C\u6B21\uFF08\u5047\u8BBE\u9996\u6B21\u53D1\u751F\uFF09": "Second (assuming the first)",
  "\u9996\u6B21\u989D\u5916reset\u7684\u6982\u7387\u5206\u5E03\u3002": "First extra reset distribution. ",
  "\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u523B\u53D1\u751F\u4E3A\u6761\u4EF6\u3002": "Conditional on the first reset at its marker. ",
  "\u6807\u7EBF\u5BF9\u5E94\u672C\u6761\u5206\u5E03\u6700\u9AD8\u5CF0\u3002": "The marker is at this distribution\u2019s highest-density hourly window. ",
  "\u7B2C\u4E8C\u6B21\u4EE5\u9996\u6B21\u5728\u9884\u6D4B\u70B9\u53D1\u751F\u4E3A\u524D\u63D0\u3002": "The second assumes the first happens at its marker.",
  "\u6807\u7EBF\u5BF9\u5E94\u6982\u7387\u5206\u5E03\u7684\u6700\u9AD8\u5CF0\u3002": "The marker is at the distribution\u2019s highest-density hourly window. ",
  "\u4E0A\u6B21reset\u52A0\u8FD1\u671F\u5E73\u5747\u95F4\u9694\uFF0C\u518D\u6821\u51C6\u5230\u5E38\u89C1\u53D1\u5E03\u949F\u70B9\u7684\u53C2\u8003\u65F6\u95F4\u3002": "Last reset plus the recent mean interval, aligned to the usual posting time. ",
  "\u5DE6\u53F3\u4E3A\u4F30\u8BA1\u8303\u56F4\u4E4B\u5916\u7684\u6982\u7387\u3002": "The values on either side are outside the estimated range.",
  "\u2190 \u66F4\u65E9 {percent}%": "\u2190 Earlier {percent}%",
  "\u66F4\u665A {percent}% \u2192": "Later {percent}% \u2192",
  "\u6700\u53EF\u80FD\u989D\u5916 reset": "Most likely extra reset",
  "\u9884\u8BA1\u989D\u5916 reset": "Estimated extra reset",
  "\u9996\u6B21\u989D\u5916reset\u7D2F\u8BA1\u6982\u7387": "First extra reset cumulative probability",
  "\u4EE5\u9996\u6B21\u53D1\u751F\u4E3A\u524D\u63D0\u7684\u7B2C\u4E8C\u6B21\u7D2F\u8BA1\u6982\u7387": "Second reset cumulative probability, conditional on the first",
  "\u4F7F\u7528 1 \u4E2A\u5907\u7528 reset": "Use 1 banked reset",
  "\u4FDD\u7559\u5907\u7528 reset": "Keep banked reset",
  "{date} 24:00\u5230\u671F\uFF08\u4F30\u7B97\uFF09": "Expires {date} 24:00 (est.)",
  "{date}\u5230\u671F": "Expires {date}",
  "{date}\u7ED3\u675F": "End of {date}",
  "\u63D0\u524D\u5151\u6362\u5C06\u8986\u76D6 {percent}%": "Replaces {percent}% remaining",
  "\u672A\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%": "No extra reset: {percent}%",
  "\u6B64\u65F6\u4ECD\u672A\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%": "Still no extra reset: {percent}%",
  "\u672A\u91CD\u7F6E\u65F6\u6682\u505C\uFF1A{percent}%": "Pause if no reset: {percent}%",
  "\u6682\u505C\uFF0C\u7B49\u5F85\u6B63\u5E38\u5237\u65B0": "Pause until normal refresh",
  "\u9884\u8BA1\u8017\u5C3D": "Estimated depletion",
  "\u5907\u7528\u5230\u671F\uFF0C\u672A\u4F7F\u7528": "Banked reset expires unused",
  "\u6B63\u5E38\u5237\u65B0": "Normal refresh",
  "\u9884\u8BA1\u6B63\u5E38\u5237\u65B0": "Estimated normal refresh",
  "\u540E\u7EED\u91CD\u65B0\u89C4\u5212": "Replan later",
  "\u6B63\u5E38\u5237\u65B0 {time}": "Normal refresh {time}",
  "\u989D\u5916\u91CD\u7F6E\u540E\u6309\u5B9E\u9645\u4F59\u989D\u91CD\u7B97": "Replan from the actual balance after the extra reset",
  "\u9884\u8BA1\u6B63\u5E38\u5237\u65B0 {time}": "Estimated normal refresh {time}",
  "\u5C06\u5148\u5230\u671F\uFF0C\u70B9\u51FB\u4F7F\u7528": "Expires first \xB7 Click to use",
  "\u70B9\u51FB\u4F7F\u7528": "Click to use",
  "\u73B0\u5728": "Now",
  "\u989D\u5EA6 {percent}% \xB7 \u5907\u7528 {count}": "Quota {percent}% \xB7 Banked {count}",
  "\u672C\u8F6E\u4FDD\u7559\u7684\u5907\u7528 reset": "Banked resets kept for later",
  "\u672C\u8F6E\u4FDD\u7559": "Kept for later",
  "\u5907\u7528 reset \xB7 {date} \u5230\u671F": "Banked reset \xB7 Expires {date}",
  "\u4ECE\u5DE6\u5411\u53F3\u7684\u989D\u5EA6\u6F0F\u6597\u4E0E\u7B56\u7565\u9009\u62E9\uFF0C\u53EF\u6A2A\u5411\u6EDA\u52A8": "Quota timeline and planning choices; scroll horizontally",
  "\u56FA\u5B9A\u65E5\u671F\u4E4B\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\u7684\u7D2F\u8BA1\u6982\u7387": "Cumulative probability of at least one extra reset by each date",
  "\u622A\u81F3 {time} \u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916 reset": "At least one extra reset by {time}",
  "\u989D\u5916\u91CD\u7F6E": "Extra reset",
  "\u6B64\u524D\u989D\u5916\u91CD\u7F6E\u6982\u7387": "Probability of an extra reset by then",
  "\u84DD\u7EBF\uFF1A\u6B64\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916 reset \u7684\u6982\u7387": "Curve: probability of at least one extra reset by then",
  "\u2212 \u6536\u8D77\u5176\u4ED6\u505A\u6CD5": "\u2212 Hide alternatives",
  "\uFF0B \u6BD4\u8F83\u8FD9\u4E00\u6B65": "+ Compare this step",
  "\uFF0B \u5176\u4ED6 {count} \u79CD\u505A\u6CD5": "+ {count} more alternatives",
  "\u53EF\u9009\uFF1A\u4F7F\u7528 Credits \u8854\u63A5": "Optional credits bridge",
  "\u989D\u5EA6\u8017\u5C3D \xB7 \u53EF\u7528 Credits \u8854\u63A5": "Quota depleted \xB7 Optional credits bridge",
  "\u6D88\u8017\u9700\u81EA\u5DF1\u9884\u4F30": "Estimate credit spending yourself",
  "\u660E\u786E\u9884\u544A": "Announced",
  "\u5DF2\u91CD\u7F6E\u8BB0\u5F55": "Reset confirmed",
  "\u53EF\u80FD\u6697\u793A": "Possible hint",
  "\u5907\u7528 reset": "Banked reset",
  "\u65B0\u529F\u80FD": "New feature",
  "\u65E0\u91CD\u7F6E\u4FE1\u53F7": "No reset signal",
  "\u6682\u672A\u8BC6\u522B": "Unclassified",
  "\u4E0A\u6B21\u516C\u5F00 reset": "Last public reset",
  "{days} \u5929\u524D": "{days} days ago",
  "\u6682\u65E0\u8BB0\u5F55": "No record",
  "\u5E73\u5747 reset \u95F4\u9694": "Mean reset interval",
  "\u6570\u636E\u4E0D\u8DB3": "Not enough data",
  "{days} \u5929": "{days} days",
  "\u672C\u6B21 campaign \xB7 {count} \u6B21 reset": "Current campaign \xB7 {count} resets",
  "\u8FD1 {days} \u5929": "Last {days} days",
  "\u975E\u6D3B\u52A8\u5386\u53F2\u56DE\u9000": "Non-campaign history fallback",
  "\u5386\u53F2\u56DE\u9000": "Historical fallback",
  " \xB7 \u6D3B\u52A8\u6837\u672C\u4E0D\u8DB3\uFF0C\u6682\u56DE\u9000": " \xB7 Too few campaign intervals; using fallback",
  " \xB7 {count} \u4E2A\u5B8C\u6574\u95F4\u9694": " \xB7 {count} complete intervals",
  "\u5747\u503C {level}% \u7F6E\u4FE1\u533A\u95F4": "{level}% confidence interval for the mean",
  "\u6837\u672C\u4E0D\u8DB3\uFF0C\u6682\u4E0D\u4F30\u8BA1": "Too few samples to estimate",
  "{low} \u2013 {high} \u5929": "{low} \u2013 {high} days",
  "\u7279\u6B8A campaign": "Current campaign",
  "\u8FDB\u884C\u4E2D": "Active",
  "\u5C1A\u672A\u5F00\u59CB": "Upcoming",
  "\u5DF2\u7ED3\u675F": "Ended",
  "28 \u5929\u6539\u8FDB\u6216 reset": "28 days of improvements or resets",
  "{start} \u8D77 \xB7 {end} \u7ED3\u675F\uFF08\u6309 Day 1 \u548C\u6D3B\u52A8\u5929\u6570\u63A8\u7B97\uFF09": "{start} to {end} (derived from Day 1 and campaign duration)",
  "\u5E38\u89C1\u53D1\u5E03\u949F\u70B9": "Typical posting time",
  "\u4F60\u7684\u65F6\u95F4\uFF08{zone}\uFF09": "your time ({zone})",
  "\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A reset \u65E5 \xB7 \u4F60\u7684\u65F6\u95F4\uFF1BTibo \u5F53\u5730 {local}": "All history \xB7 {count} reset days \xB7 your time; {local} Tibo\u2019s time",
  "\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A reset \u65E5 \xB7 \u4F60\u7684\u65F6\u95F4": "All history \xB7 {count} reset days \xB7 your time",
  "\u6700\u53EF\u80FD reset \u65F6\u95F4": "Most likely reset time",
  "\u5E73\u5747\u95F4\u9694\u53C2\u8003\u65F6\u95F4": "Mean-interval reference time",
  "\u5168\u90E8\u5386\u53F2": "All history",
  "{scope} {count} \u6B21 \xB7 \u5E38\u89C1 {time}\uFF08{zone}\uFF09": "{scope} \xB7 {count} resets \xB7 Typical {time} ({zone})",
  "\u4E0B\u6B21\u9884\u8BA1\uFF08\u4E2D\u4F4D\uFF09": "Next reset estimate (median)",
  "\u6682\u65E0\u6CD5\u4F30\u8BA1": "Not enough data to estimate",
  "\u4E0B\u6B21 {coverage}% \u9884\u6D4B\u7A97\u53E3": "Next reset \xB7 {coverage}% prediction window",
  "Day {day} \u529F\u80FD\u5E16": "Day {day} feature post",
  "reset \u6B21\u65E5\u51B7\u5374\u671F": "Day-after-reset cooldown",
  "\u6D3B\u52A8\u65E5\u5185\u5DF2 reset": "Reset already occurred on this campaign day",
  "\u5F53\u524D\u9884\u6D4B\u7EA6\u675F": "Active forecast constraint",
  "\u622A\u81F3 {time}{rule}": "Until {time}{rule}",
  " \xB7 \u7528\u6237\u8BBE\u5B9A\u89C4\u5219": " \xB7 User-defined rule",
  "\u4E0B\u6B21 reset \u9884\u6D4B": "Next reset forecast",
  "Tibo \u6700\u8FD1\u56DE\u590D": "Tibo\u2019s latest reply",
  "Tibo \u6700\u8FD1\u5E16\u5B50": "Tibo\u2019s latest post",
  "Tibo \u6700\u8FD1\u76F8\u5173\u56DE\u590D": "Tibo\u2019s latest related reply",
  "Tibo \u6700\u8FD1\u76F8\u5173\u5E16\u5B50": "Tibo\u2019s latest related post",
  "Tibo \u76F8\u5173\u5E16\u5B50": "Tibo\u2019s related posts",
  "\u6682\u65E0\u53EF\u7528\u5E16\u5B50\uFF0F\u56DE\u590D": "No post or reply available",
  "\u5B9E\u65F6\u8BB0\u5F55": "Live history",
  "\u7F13\u5B58 {date}": "Cached {date}",
  " \xB7 \u66F4\u65B0 {time}": " \xB7 Updated {time}",
  "\u6A21\u578B\u9884\u6D4B": "Model forecast",
  "\u6A21\u578B\u672A\u6821\u51C6": "Uncalibrated model",
  "\u66F4\u591A\u6570\u636E": "More data",
  "\u964D\u5230\u5E73\u65F6\u7684 {percent}%": "{percent}% of usual",
  "\u672A\u6765 48 \u5C0F\u65F6": "Next 48h",
  "\u53EF\u80FD\u7A97\u53E3": "Likely window",
  "\u4E0A\u6B21 reset": "Last reset",
  "\u6D3B\u52A8": "Campaign",
  "\u7B2C {day} / {total} \u5929 \xB7 {end} \u7ED3\u675F": "Day {day} of {total} \xB7 ends {end}",
  "{hours} \u5C0F\u65F6\u524D": "{hours}h ago",
  "\u989D\u5916 reset \u9884\u6D4B\u5173\u952E\u6570\u636E": "Extra reset forecast evidence",
  "\u9884\u6D4B\u600E\u4E48\u7B97": "How the forecast is built",
  "\u53D1\u5E03\u949F\u70B9": "Time of day",
  "\u91CD\u7F6E\u95F4\u9694": "Time between resets",
  "\u8DDD\u4E0A\u6B21\u91CD\u7F6E": "Time since last reset",
  "\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A\u91CD\u7F6E\u65E5": "All history \xB7 {count} reset days",
  "\u5F53\u524D\u6D3B\u52A8 \xB7 {count} \u4E2A\u5B8C\u6574\u95F4\u9694": "Current campaign \xB7 {count} complete intervals",
  "\u8FD130\u5929\uFF0F\u5386\u53F2\u56DE\u9000 \xB7 {count} \u4E2A\u95F4\u9694": "Recent 30 days / history fallback \xB7 {count} intervals",
  "\u5E38\u89C1 \u4F60\u7684\u65F6\u95F4 {time} \xB7 Tibo \u5F53\u5730 {local}": "Typically {time} your time \xB7 {local} Tibo\u2019s time",
  "\u5E38\u89C1 \u4F60\u7684\u65F6\u95F4 {time}": "Typically {time} your time",
  "\u5E73\u5747 {days} \u5929": "Mean {days} days",
  "\u81EA {time} \u8D77\uFF0C\u5DF2\u8FC7 {days} \u5929": "{days} days since {time}",
  "\u53D1\u5E03\u949F\u70B9\u4F7F\u7528\u5168\u90E8\u5386\u53F2\u81EA\u52A8\u91CD\u7F6E\u65E5\uFF1B\u91CD\u7F6E\u95F4\u9694\u4F18\u5148\u4F7F\u7528\u5F53\u524D\u6D3B\u52A8\u5185\u7684\u5B8C\u6574\u95F4\u9694\uFF0C\u6837\u672C\u4E0D\u8DB3\u65F6\u56DE\u9000\u5230\u8FD1\u671F\u6216\u5386\u53F2\u3002": "Posting time uses all recorded automatic-reset days. Reset intervals use complete intervals within the active campaign, falling back to recent or historical data when needed.",
  "\u57FA\u7840\u98CE\u9669\u7ED3\u5408\u8DDD\u4E0A\u6B21\u91CD\u7F6E\u7684\u65F6\u95F4\u3001\u6240\u9009\u95F4\u9694\u5206\u5E03\u3001\u5E16\u5B50\u4FE1\u53F7\u548C\u51B7\u5374\u89C4\u5219\uFF0C\u518D\u7528\u5386\u53F2\u53D1\u5E03\u949F\u70B9\u52A0\u6743\u3002": "Base risk combines time since the last reset, the selected interval distribution, post signals and cooldown rules. Historical posting times then weight that risk.",
  "\u65F6\u6BB5\u98CE\u9669 = \u57FA\u7840\u98CE\u9669 \xD7 \u5386\u53F2\u949F\u70B9\u6743\u91CD \xF7 \u5F53\u65E5\u5E73\u5747\u6743\u91CD": "Time-slot risk = base risk \xD7 historical clock weight \xF7 that day\u2019s mean weight",
  "F\u2080\uFF1A\u57FA\u7840\u7D2F\u8BA1\u6982\u7387\uFF1Bw\uFF1A\u5168\u5386\u53F2\u949F\u70B9\u6743\u91CD\uFF1Bt*\uFF1A\u6700\u53EF\u80FD\u7684\u5C0F\u65F6\u7A97\u53E3\u3002": "F\u2080: base cumulative probability; w: all-history clock weight; t*: most likely hourly window.",
  "\u7D2F\u8BA1\u6982\u7387\u7531\u52A0\u6743\u98CE\u9669\u7D2F\u79EF\u5F97\u5230\uFF1B\u6700\u53EF\u80FD\u65F6\u95F4\u53D6\u5B9E\u9645\u5206\u5E03\u4E2D\u6982\u7387\u5BC6\u5EA6\u6700\u9AD8\u7684\u5C0F\u65F6\u7A97\u53E3\uFF0C\u4E0D\u662F\u7B80\u5355\u628A\u5E73\u5747\u5929\u6570\u52A0\u5230\u4E0A\u6B21\u65F6\u95F4\u3002": "Cumulative probability comes from the weighted risk. The most likely time is the highest-density hourly window of the resulting distribution, rather than simply the last reset plus the mean interval.",
  "\u7B2C\u4E8C\u6761\u66F2\u7EBF\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u95F4\u53D1\u751F\u4E3A\u524D\u63D0\uFF0C\u4ECE\u8BE5\u70B9\u91CD\u65B0\u8BA1\u65F6\uFF1B\u5176\u7D2F\u8BA1\u503C\u4E5F\u4EE5\u8FD9\u4E2A\u524D\u63D0\u4E3A\u6761\u4EF6\u3002": "The second curve assumes the first reset happens at its marker and restarts the clock there. Its cumulative values are conditional on that first reset.",
  "\u5F53\u524D\u5047\u8BBE": "Current assumptions",
  "\u672A\u5047\u8BBE\u989D\u5916\u91CD\u7F6E": "No extra reset assumed",
  "\u8BA1\u5212\u4E2D\u7684\u5907\u7528\u3001\u6B63\u5E38\u548C\u5047\u8BBE\u91CD\u7F6E\u90FD\u4ECE\u8BE5\u65F6\u523B\u91CD\u65B0\u5F00\u59CB7\u5929\u5468\u671F\uFF1B\u53EA\u6709\u9009\u4E2D\u7684\u5047\u8BBE\u624D\u4F1A\u8865\u6EE1\u9884\u6D4B\u989D\u5EA6\u3002": "Planned banked, normal and assumed resets each restart the seven-day cycle. Forecast quota is added only for selected assumptions.",
  "\u9996\u6B21 {first}": "First: {first}",
  "\u9996\u6B21 {first} \xB7 \u7B2C\u4E8C\u6B21 {second}": "First: {first} \xB7 Second: {second}",
  "\u9884\u6D4B\u5DF2\u5173\u95ED\uFF0C\u5386\u53F2\u7EDF\u8BA1\u4ECD\u4FDD\u7559\u3002": "Forecast is off. Historical statistics remain available.",
  "\u672C\u5730\u4F30\u8BA1\uFF0C\u6A21\u578B\u5C1A\u672A\u6821\u51C6\u3002": "Local estimate; the model has not been calibrated."
};
function translate(language2, source, values = {}) {
  source = String(source ?? "");
  const pattern = uiLocale(language2) === "zh-CN" ? source : english[source] ?? source;
  return pattern.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
var translator = (language2 = "zh-CN") => (source, values) => translate(language2, source, values);
function diagnosticText(language2, message, kind = "forecast") {
  if (uiLocale(language2) === "zh-CN") return message;
  if (english[message]) return english[message];
  const expired = message?.match(/^备用 reset (\d{4}-\d{2}-\d{2}) 已过期$/);
  if (expired) return translate(language2, "\u5907\u7528 reset {date} \u5DF2\u8FC7\u671F", { date: expired[1] });
  if (message && !/\p{Script=Han}/u.test(message)) return message;
  return translate(language2, kind === "input" ? "\u8BF7\u68C0\u67E5\u5269\u4F59\u989D\u5EA6\u3001\u5237\u65B0\u65F6\u95F4\u548C\u5907\u7528\u5230\u671F\u65E5\u671F\u3002" : "\u9884\u6D4B\u6570\u636E\u6682\u4E0D\u53EF\u7528");
}

// src/forecast-method-view.js
var round = (value) => Number(value.toFixed(2));
function renderForecastMethod({ source, prediction, result, timeZone: timeZone2, locale = "zh-CN" }, escape3) {
  const t2 = translator(locale), evidence = source?.prediction ?? prediction;
  if (!evidence) return "";
  const clock = evidence.releaseClock, interval = evidence.evidence?.intervalModel;
  const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(uiLocale(locale), {
    timeZone: timeZone2,
    month: uiLocale(locale) === "zh-CN" ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value)) : t2("\u6682\u65E0\u8BB0\u5F55");
  const clockIn = (zone) => new Intl.DateTimeFormat(zone === timeZone2 ? uiLocale(locale) : "en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...zone === timeZone2 ? {} : { timeZoneName: "short" }
  }).format(new Date(clock.typicalTimeAt));
  const posting = clock?.typicalTimeAt ? clockIn(timeZone2) : clock?.typicalTime;
  const publisher = clock?.typicalTimeAt && clock.timeZone && clock.timeZone !== timeZone2 ? clockIn(clock.timeZone) : null;
  const count = interval?.sampleCount ?? interval?.recentIntervalCount ?? 0;
  const scope = interval?.source === "campaign-intervals" ? t2("\u5F53\u524D\u6D3B\u52A8 \xB7 {count} \u4E2A\u5B8C\u6574\u95F4\u9694", { count }) : interval?.source === "recent-30-day-intervals" ? `${t2("\u8FD1 {days} \u5929", { days: interval.windowDays ?? 30 })} \xB7 ${count}` : t2("\u8FD130\u5929\uFF0F\u5386\u53F2\u56DE\u9000 \xB7 {count} \u4E2A\u95F4\u9694", { count });
  const row = (label, value, note) => `<div><dt>${escape3(t2(label))}</dt><dd>${escape3(value)}<small>${escape3(note)}</small></dd></div>`;
  const rows = [
    row(
      "\u53D1\u5E03\u949F\u70B9",
      posting ? publisher ? t2("\u5E38\u89C1 \u4F60\u7684\u65F6\u95F4 {time} \xB7 Tibo \u5F53\u5730 {local}", { time: posting, local: publisher }) : t2("\u5E38\u89C1 \u4F60\u7684\u65F6\u95F4 {time}", { time: posting }) : t2("\u6570\u636E\u4E0D\u8DB3"),
      t2("\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A\u91CD\u7F6E\u65E5", { count: clock?.sampleCount ?? 0 })
    ),
    row("\u91CD\u7F6E\u95F4\u9694", Number.isFinite(interval?.meanIntervalDays) ? t2("\u5E73\u5747 {days} \u5929", { days: round(interval.meanIntervalDays) }) : t2("\u6570\u636E\u4E0D\u8DB3"), scope),
    row("\u8DDD\u4E0A\u6B21\u91CD\u7F6E", Number.isFinite(source?.daysSinceReset) ? t2("{days} \u5929\u524D", { days: round(source.daysSinceReset) }) : t2("\u6570\u636E\u4E0D\u8DB3"), date(source?.lastResetAt))
  ];
  const scenario = result?.forecastScenario;
  const first = scenario?.selected ? date(scenario.at ?? scenario.pointAt ?? new Date(Date.parse(result.now) + scenario.hours * 36e5).toISOString()) : null;
  const second = scenario?.following?.selected ? date(Number.isFinite(scenario.following.hours) ? new Date(Date.parse(result.now) + scenario.following.hours * 36e5).toISOString() : scenario.following.at ?? scenario.following.pointAt) : null;
  const assumptions = first ? second ? t2("\u9996\u6B21 {first} \xB7 \u7B2C\u4E8C\u6B21 {second}", { first, second }) : t2("\u9996\u6B21 {first}", { first }) : t2("\u672A\u5047\u8BBE\u989D\u5916\u91CD\u7F6E");
  const formula = prediction?.model === "local-recent-intervals-v5" ? `<div class="forecast-formula" data-forecast-formula><p>${escape3(t2("\u65F6\u6BB5\u98CE\u9669 = \u57FA\u7840\u98CE\u9669 \xD7 \u5386\u53F2\u949F\u70B9\u6743\u91CD \xF7 \u5F53\u65E5\u5E73\u5747\u6743\u91CD"))}</p><code>\u0394H\u1D62 = log[(1 \u2212 F\u2080(t\u1D62\u208B\u2081)) / (1 \u2212 F\u2080(t\u1D62))] \xD7 w\u1D62 / w\u0304(day\u1D62)</code><code>F(t) = 1 \u2212 exp(\u2212\u03A3 \u0394H\u1D62) \xB7 t* = argmax(\u0394F\u1D62 / \u0394t\u1D62)</code><small>${t2("F\u2080\uFF1A\u57FA\u7840\u7D2F\u8BA1\u6982\u7387\uFF1Bw\uFF1A\u5168\u5386\u53F2\u949F\u70B9\u6743\u91CD\uFF1Bt*\uFF1A\u6700\u53EF\u80FD\u7684\u5C0F\u65F6\u7A97\u53E3\u3002")}</small></div>` : "";
  return `<section class="forecast-method" data-forecast-method aria-label="${t2("\u9884\u6D4B\u600E\u4E48\u7B97")}"><details><summary><h3>${t2("\u9884\u6D4B\u600E\u4E48\u7B97")}</h3></summary><dl>${rows.join("")}</dl><p>${t2("\u53D1\u5E03\u949F\u70B9\u4F7F\u7528\u5168\u90E8\u5386\u53F2\u81EA\u52A8\u91CD\u7F6E\u65E5\uFF1B\u91CD\u7F6E\u95F4\u9694\u4F18\u5148\u4F7F\u7528\u5F53\u524D\u6D3B\u52A8\u5185\u7684\u5B8C\u6574\u95F4\u9694\uFF0C\u6837\u672C\u4E0D\u8DB3\u65F6\u56DE\u9000\u5230\u8FD1\u671F\u6216\u5386\u53F2\u3002")}</p>${prediction ? `<p>${t2("\u57FA\u7840\u98CE\u9669\u7ED3\u5408\u8DDD\u4E0A\u6B21\u91CD\u7F6E\u7684\u65F6\u95F4\u3001\u6240\u9009\u95F4\u9694\u5206\u5E03\u3001\u5E16\u5B50\u4FE1\u53F7\u548C\u51B7\u5374\u89C4\u5219\uFF0C\u518D\u7528\u5386\u53F2\u53D1\u5E03\u949F\u70B9\u52A0\u6743\u3002")}</p>${formula}<p>${t2("\u7D2F\u8BA1\u6982\u7387\u7531\u52A0\u6743\u98CE\u9669\u7D2F\u79EF\u5F97\u5230\uFF1B\u6700\u53EF\u80FD\u65F6\u95F4\u53D6\u5B9E\u9645\u5206\u5E03\u4E2D\u6982\u7387\u5BC6\u5EA6\u6700\u9AD8\u7684\u5C0F\u65F6\u7A97\u53E3\uFF0C\u4E0D\u662F\u7B80\u5355\u628A\u5E73\u5747\u5929\u6570\u52A0\u5230\u4E0A\u6B21\u65F6\u95F4\u3002")}</p><p class="forecast-conditional-note">${t2("\u7B2C\u4E8C\u6761\u66F2\u7EBF\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u95F4\u53D1\u751F\u4E3A\u524D\u63D0\uFF0C\u4ECE\u8BE5\u70B9\u91CD\u65B0\u8BA1\u65F6\uFF1B\u5176\u7D2F\u8BA1\u503C\u4E5F\u4EE5\u8FD9\u4E2A\u524D\u63D0\u4E3A\u6761\u4EF6\u3002")}</p>` : `<p>${t2("\u9884\u6D4B\u5DF2\u5173\u95ED\uFF0C\u5386\u53F2\u7EDF\u8BA1\u4ECD\u4FDD\u7559\u3002")}</p>`}<p class="forecast-assumptions"><strong>${t2("\u5F53\u524D\u5047\u8BBE")}:</strong> ${escape3(assumptions)}</p><p>${t2("\u8BA1\u5212\u4E2D\u7684\u5907\u7528\u3001\u6B63\u5E38\u548C\u5047\u8BBE\u91CD\u7F6E\u90FD\u4ECE\u8BE5\u65F6\u523B\u91CD\u65B0\u5F00\u59CB7\u5929\u5468\u671F\uFF1B\u53EA\u6709\u9009\u4E2D\u7684\u5047\u8BBE\u624D\u4F1A\u8865\u6EE1\u9884\u6D4B\u989D\u5EA6\u3002")}</p><small>${t2("\u672C\u5730\u4F30\u8BA1\uFF0C\u6A21\u578B\u5C1A\u672A\u6821\u51C6\u3002")}</small></details></section>`;
}

// src/reset-interval-model.js
var DAY = 864e5;
var t95 = [
  0,
  12.706,
  4.303,
  3.182,
  2.776,
  2.571,
  2.447,
  2.365,
  2.306,
  2.262,
  2.228,
  2.201,
  2.179,
  2.16,
  2.145,
  2.131,
  2.12,
  2.11,
  2.101,
  2.093,
  2.086,
  2.08,
  2.074,
  2.069,
  2.064,
  2.06,
  2.056,
  2.052,
  2.048,
  2.045,
  2.042
];
function normalSurvival(z) {
  const x = Math.abs(z) / Math.SQRT2, t2 = 1 / (1 + 0.3275911 * x);
  const tail = ((((1.061405429 * t2 - 1.453152027) * t2 + 1.421413741) * t2 - 0.284496736) * t2 + 0.254829592) * t2 * Math.exp(-x * x) / 2;
  return z >= 0 ? tail : 1 - tail;
}
function intervalSurvival(distribution, ageDays) {
  if (ageDays <= 0) return 1;
  if (distribution.regime) {
    const boundary = distribution.regime.switchAgeDays;
    if (ageDays > Math.max(0, boundary)) {
      const before = boundary > 0 ? kernelSurvival(distribution, boundary) : 1;
      const after = distribution.regime.afterDistribution;
      return after ? before * kernelSurvival(after, ageDays) / kernelSurvival(after, Math.max(0, boundary)) : before;
    }
  }
  return kernelSurvival(distribution, ageDays);
}
function kernelSurvival(distribution, ageDays) {
  if (ageDays <= 0) return 1;
  const { intervals, bandwidthDays, priorEquivalentIntervals, meanIntervalDays } = distribution;
  const observed = intervals.reduce((sum, length) => sum + normalSurvival((ageDays - length) / bandwidthDays) / normalSurvival(-length / bandwidthDays), 0);
  return (observed + priorEquivalentIntervals * Math.exp(-ageDays / meanIntervalDays)) / (intervals.length + priorEquivalentIntervals);
}
function renewIntervalDistribution(distribution, resetAt) {
  return distribution?.regime ? { ...distribution, regime: {
    ...distribution.regime,
    switchAgeDays: (Date.parse(distribution.regime.endsAt) - resetAt) / DAY
  } } : distribution;
}
function fitIntervals(intervals, priorDailyProbability) {
  const mean = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null;
  const average = mean(intervals);
  const variance = intervals.length > 1 ? intervals.reduce((sum, value) => sum + (value - average) ** 2, 0) / (intervals.length - 1) : null;
  const error = variance === null ? null : (t95[Math.min(30, intervals.length - 1)] ?? 1.96) * Math.sqrt(variance / intervals.length);
  const confidence = error === null ? null : {
    level: 0.95,
    lowDays: Math.max(0, average - error),
    highDays: average + error,
    method: "student-t-mean-interval",
    sampleCount: intervals.length,
    assumption: "approximately-independent-intervals; not a next-reset prediction window"
  };
  const daily = average === null ? priorDailyProbability : -Math.expm1(-1 / average);
  const distribution = intervals.length ? {
    method: "positive-interval-kde-with-exponential-prior",
    intervals,
    bandwidthDays: Math.max(1, 1.06 * Math.sqrt(variance ?? 0) * intervals.length ** -0.2),
    priorEquivalentIntervals: 2,
    meanIntervalDays: average
  } : null;
  return { daily, distribution, meanIntervalDays: average, meanIntervalConfidence: confidence };
}
function resetIntervalModel(times, nowMs, timeZone2, priorDailyProbability, campaign = null) {
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  const eventDays = [...new Map(times.map((time) => [localDay.format(time), time])).values()];
  const all = eventDays.slice(1).map((time, index) => ({ end: time, start: eventDays[index], days: (time - eventDays[index]) / DAY }));
  const start = Date.parse(campaign?.startsAt), end = Date.parse(campaign?.endsAt);
  const active = campaign?.status === "active", ended = campaign?.status === "ended";
  const inside = all.filter((item) => item.start >= start && item.end < end);
  const outside = campaign ? all.filter((item) => item.end < start || item.start >= end) : all;
  const after = all.filter((item) => item.start >= end);
  const eligible = ended ? after : all;
  const recent = eligible.filter((item) => item.start >= nowMs - 30 * DAY);
  const campaignFit = active && inside.length > 0;
  const chosen = campaignFit ? inside : recent.length ? recent : ended ? outside : all;
  const intervals = chosen.map((item) => item.days), fit = fitIntervals(intervals, priorDailyProbability);
  if (campaignFit && fit.distribution) {
    const fallback = fitIntervals(outside.map((item) => item.days), priorDailyProbability);
    fit.distribution.regime = {
      endsAt: campaign.endsAt,
      switchAgeDays: (end - times.at(-1)) / DAY,
      afterDistribution: fallback.distribution,
      afterSource: fallback.distribution ? "non-campaign-historical-intervals" : "unavailable",
      afterSampleCount: outside.length
    };
  }
  const bins = Math.min(366, Math.max(60, Math.ceil(Math.max(0, ...intervals)) + 8));
  const hazards = fit.distribution ? Array.from({ length: bins }, (_, day) => 1 - intervalSurvival(fit.distribution, day + 1) / intervalSurvival(fit.distribution, day)) : [];
  return {
    ...fit,
    hazards,
    intervals,
    source: fit.meanIntervalDays === null ? "manual-prior" : campaignFit ? "campaign-intervals" : recent.length ? "recent-30-day-intervals" : ended ? "non-campaign-historical-intervals" : "historical-interval-fallback",
    selectionReason: active && !campaignFit ? "campaign-has-no-complete-interval" : ended ? "campaign-ended" : null,
    sampleCount: intervals.length,
    sampleFrom: chosen.length ? new Date(chosen[0].start).toISOString() : null,
    sampleTo: chosen.length ? new Date(chosen.at(-1).end).toISOString() : null,
    windowDays: campaignFit ? null : 30,
    recentIntervalCount: recent.length,
    campaignIntervalCount: inside.length,
    campaignEventCount: eventDays.filter((time) => time >= start && time < end).length,
    historicalMeanIntervalDays: all.length ? all.reduce((sum, item) => sum + item.days, 0) / all.length : null,
    recentEventDays: eventDays.filter((time) => time >= nowMs - 30 * DAY).length,
    recentCoverageDays: times.length ? Math.min(30, (nowMs - times[0]) / DAY) : 0,
    priorEquivalentIntervals: 2
  };
}

// src/reset-day-evidence.js
function campaignDay(post) {
  const explicit = post.signal?.campaignDay;
  if (Number.isInteger(explicit) && explicit > 0 && explicit <= 366) return explicit;
  const match = post.text?.match(/^\s*Day\s*0*(\d{1,3})(?:\b|\/)/im);
  return match ? Number(match[1]) : null;
}
function campaignFeature(post) {
  return campaignDay(post) !== null && post.signal?.kind === "new_feature" && post.signal.confidence >= 0.8;
}
var SUPPRESSED_HAZARD_FACTOR = 0.05;
function resetCooldownRule({ lastReset, now, timeZone: timeZone2 }) {
  if (!Number.isFinite(lastReset)) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(formatter.formatToParts(lastReset).map((part) => [part.type, part.value]));
  const target = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 2)).toISOString().slice(0, 10);
  let lo = lastReset, hi = lastReset + 72 * 36e5;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (formatter.format(mid) < target) lo = mid;
    else hi = mid;
  }
  if (now >= hi) return null;
  return {
    kind: "reset-next-day-cooldown",
    applied: true,
    hazardFactor: SUPPRESSED_HAZARD_FACTOR,
    lastResetAt: new Date(lastReset).toISOString(),
    from: new Date(lastReset).toISOString(),
    until: new Date(hi).toISOString(),
    untilHours: (hi - now) / 36e5,
    basis: "user-requested-hard-assumption",
    timeZone: timeZone2
  };
}

// src/reset-timing-distribution.js
var HOUR = 36e5;
function hourlyResetDistribution({ now, probabilityByHours, horizonHours = 336, binHours = 1 }) {
  const origin = new Date(now).getTime();
  if (!Number.isFinite(origin) || !Number.isFinite(horizonHours) || horizonHours <= 0 || !Number.isFinite(binHours) || binHours <= 0) throw new Error("\u6982\u7387\u7ED8\u56FE\u65F6\u95F4\u53CA\u5206\u6BB5\u65F6\u957F\u65E0\u6548");
  const bins = [];
  const stride = binHours * HOUR;
  const firstBoundary = (Math.floor(origin / stride) + 1) * stride;
  let before = 0;
  for (let startHours = 0, index = 0; startHours < horizonHours; index++) {
    const endHours = Math.min(horizonHours, (firstBoundary - origin) / HOUR + index * binHours), after = probabilityByHours(endHours);
    if (!Number.isFinite(after) || after < before - 1e-10 || after < 0 || after > 1) return null;
    const probability2 = Math.max(0, after - before);
    bins.push({
      startHours,
      endHours,
      probability: probability2,
      densityPerHour: probability2 / (endHours - startHours),
      startAt: new Date(Math.round(origin + startHours * HOUR)).toISOString(),
      endAt: new Date(Math.round(origin + endHours * HOUR)).toISOString(),
      cumulativeProbability: after
    });
    before = after;
    startHours = endHours;
  }
  const peak = bins.reduce((best, bin) => !best || bin.densityPerHour > best.densityPerHour + 1e-12 ? bin : best, null);
  const pointHours = (peak.startHours + peak.endHours) / 2;
  const mode = peak.probability > 1e-12 ? {
    method: "maximum-hour-window-density",
    pointAt: new Date(Math.round(origin + pointHours * HOUR)).toISOString(),
    pointHours,
    from: peak.startAt,
    to: peak.endAt,
    fromHours: peak.startHours,
    toHours: peak.endHours,
    nearbyHours: peak.endHours - peak.startHours,
    probability: peak.probability,
    earlierProbability: probabilityByHours(peak.startHours),
    laterProbability: 1 - peak.cumulativeProbability,
    cumulativeProbability: probabilityByHours(pointHours),
    searchHours: horizonHours
  } : null;
  return {
    bins,
    horizonHours,
    binHours,
    tailProbability: 1 - before,
    mode,
    maxDensityPerHour: Math.max(0, ...bins.map((bin) => bin.densityPerHour)),
    basis: "first-future-reset-cdf-differences"
  };
}
function resetTimingDistribution({
  now,
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  probabilityByHours,
  searchDays = 14
}) {
  const start = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isInteger(searchDays) || searchDays < 1 || searchDays > 31)
    throw new Error("\u91CD\u7F6E\u5206\u5E03\u9700\u8981\u6709\u6548\u65F6\u95F4\u53CA1\u201331\u5929\u641C\u7D22\u8303\u56F4");
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  const days = [];
  let from = start, before = 0;
  for (let index = 0; index < searchDays; index++) {
    const date = localDay.format(from);
    let lo = from, hi = from + 27 * HOUR;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (localDay.format(mid) === date) lo = mid;
      else hi = mid;
    }
    const fromHours = (from - start) / HOUR, toHours = (hi - start) / HOUR;
    const after = probabilityByHours(toHours);
    if (!Number.isFinite(after) || after < before - 1e-10 || after < 0 || after > 1) return null;
    days.push({
      date,
      from: new Date(from).toISOString(),
      to: new Date(hi).toISOString(),
      fromHours,
      toHours,
      probability: Math.max(0, after - before),
      earlierProbability: before,
      laterProbability: 1 - after
    });
    from = hi;
    before = after;
  }
  const peak = days.reduce((best, day) => !best || day.probability > best.probability + 1e-12 ? day : best, null);
  const mostLikely = peak.probability > 1e-12 ? {
    ...peak,
    anchorHours: (peak.fromHours + peak.toHours) / 2,
    anchorAt: new Date(Math.round((Date.parse(peak.from) + Date.parse(peak.to)) / 2)).toISOString()
  } : null;
  return { basis: "first-future-reset-local-calendar-day", timeZone: timeZone2, searchDays, days, mostLikely };
}

// src/reset-release-clock.js
var DAY2 = 864e5;
var HOUR2 = 36e5;
var SLOT = 15 * 6e4;
var caches = /* @__PURE__ */ new WeakMap();
var hazardCaches = /* @__PURE__ */ new WeakMap();
function clockCache(clock) {
  if (!caches.has(clock)) caches.set(clock, { days: /* @__PURE__ */ new Map(), formatter: new Intl.DateTimeFormat("en-CA", {
    timeZone: clock.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }) });
  return caches.get(clock);
}
var parts = (stamp, clock) => Object.fromEntries(clockCache(clock).formatter.formatToParts(stamp).map((part) => [part.type, Number(part.value)]));
function zonedStamp(target, clock) {
  let stamp = target;
  for (let i = 0; i < 4; i++) {
    const p = parts(stamp, clock);
    const corrected = target - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - stamp);
    if (corrected === stamp) break;
    stamp = corrected;
  }
  return stamp;
}
function clockDay(stamp, clock) {
  const p = parts(stamp, clock), key = `${p.year}-${p.month}-${p.day}`;
  const cache = clockCache(clock).days;
  if (!cache.has(key)) {
    const start = zonedStamp(Date.UTC(p.year, p.month - 1, p.day), clock);
    const end = zonedStamp(Date.UTC(p.year, p.month - 1, p.day + 1), clock);
    const weights = [], prefix = [0];
    for (let time = start; time < end; time += SLOT) {
      const local = parts(time + SLOT / 2, clock);
      const weight = clock.quarterHourWeights[Math.floor((local.hour * 60 + local.minute) / 15)];
      weights.push(weight);
      prefix.push(prefix.at(-1) + weight * Math.min(SLOT, end - time));
    }
    cache.set(key, { start, end, weights, prefix });
  }
  return cache.get(key);
}
function logBesselI0(kappa) {
  let term = 1, sum = 1;
  for (let n = 1; n < 200; n++) {
    term *= kappa * kappa / (4 * n * n);
    sum += term;
    if (term < sum * 1e-14) break;
  }
  return Math.log(sum);
}
function fitResetReleaseClock({ times, now, timeZone: timeZone2 }) {
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  times = [...new Map(times.filter((time) => time <= now).sort((a, b) => a - b).map((time) => [dateFormat.format(time), time])).values()];
  if (times.length < 3) return null;
  const clock = {
    timeZone: timeZone2,
    originAt: new Date(now).toISOString(),
    windowDays: null,
    sampleCount: times.length,
    fromAt: new Date(times[0]).toISOString(),
    throughAt: new Date(times.at(-1)).toISOString(),
    historyDays: (now - times[0]) / DAY2,
    sampleScope: "all-history",
    sampleUnit: "automatic-reset-day",
    sampleWeighting: "equal",
    gridMinutes: 15,
    method: "equal-weight-von-mises-kde",
    bandwidthSelection: "leave-one-out-log-likelihood",
    concentrationSearch: { min: 0, max: 64, candidates: 22 },
    uniformMixture: 1e-3
  };
  const samples = times.map((time) => {
    const p = parts(time, clock);
    return (p.hour * 60 + p.minute + p.second / 60) * 2 * Math.PI / 1440;
  });
  const cosines = samples.map((angle) => samples.map((other) => Math.cos(angle - other)));
  const candidates = [0, ...Array.from({ length: 21 }, (_, index) => 2 ** (-4 + index / 2))];
  const scores = candidates.map((kappa) => cosines.reduce((score, row, index) => score + Math.log(
    row.reduce((sum, cosine, j) => sum + (j === index ? 0 : Math.exp(kappa * (cosine - 1))), 0) / (samples.length - 1)
  ) + kappa - logBesselI0(kappa), 0));
  clock.concentration = candidates[scores.indexOf(Math.max(...scores))];
  clock.bandwidthMinutes = clock.concentration > 0 ? 1440 / (2 * Math.PI * Math.sqrt(clock.concentration)) : 720;
  const normalizer = clock.concentration - logBesselI0(clock.concentration);
  const density = (minute) => clock.uniformMixture + (1 - clock.uniformMixture) * samples.reduce((sum, angle) => sum + Math.exp(clock.concentration * (Math.cos(minute * 2 * Math.PI / 1440 - angle) - 1) + normalizer), 0) / samples.length;
  const peaks = Array.from({ length: 96 }, (_, index) => density(index * 15));
  clock.typicalMinuteOfDay = peaks.indexOf(Math.max(...peaks)) * 15;
  clock.typicalTime = `${String(Math.floor(clock.typicalMinuteOfDay / 60)).padStart(2, "0")}:${String(clock.typicalMinuteOfDay % 60).padStart(2, "0")}`;
  const current = parts(now, clock);
  clock.typicalTimeAt = new Date(zonedStamp(Date.UTC(
    current.year,
    current.month - 1,
    current.day,
    Math.floor(clock.typicalMinuteOfDay / 60),
    clock.typicalMinuteOfDay % 60
  ), clock)).toISOString();
  clock.quarterHourWeights = Array.from({ length: 96 }, (_, index) => density(index * 15 + 7.5));
  return clock;
}
function releaseClockProbability(prediction, hours, baseProbability) {
  if (prediction.model === "local-recent-intervals-v5")
    return continuousClockProbability(prediction, hours, baseProbability);
  const clock = prediction.releaseClock, origin = Date.parse(clock.originAt), stamp = origin + hours * HOUR2;
  const day = clockDay(stamp, clock);
  let from = Math.max(0, (day.start - origin) / HOUR2), to = (day.end - origin) / HOUR2;
  for (const window2 of prediction.forecastWindows) for (const boundary of [window2.startHours, window2.endHours]) {
    if (Math.abs(boundary - hours) < 1e-8) return baseProbability(hours);
    if (boundary < hours) from = Math.max(from, boundary);
    else to = Math.min(to, boundary);
  }
  if (hours <= from + 1e-8 || hours >= to - 1e-8) return baseProbability(hours);
  const integral = (time) => {
    const position3 = (time - day.start) / SLOT, slot = Math.min(day.weights.length - 1, Math.floor(position3));
    if (time >= day.end) return day.prefix.at(-1);
    return day.prefix[slot] + (position3 - slot) * SLOT * day.weights[slot];
  };
  const start = integral(origin + from * HOUR2), total = integral(origin + to * HOUR2) - start;
  const fraction = (integral(stamp) - start) / total;
  const before = baseProbability(from), after = baseProbability(to);
  return Math.max(0, Math.min(1, before + (after - before) * fraction));
}
function continuousClockProbability(prediction, hours, baseProbability) {
  const clock = prediction.releaseClock, origin = Date.parse(clock.originAt), stepHours = SLOT / HOUR2;
  if (!hazardCaches.has(prediction)) hazardCaches.set(prediction, { prefix: [0] });
  const { prefix } = hazardCaches.get(prediction);
  const increment = (from, to) => {
    const cuts = [from, ...[
      ...prediction.forecastWindows.flatMap((window2) => [window2.startHours, window2.endHours]),
      ...(prediction.evidence.hardRules ?? []).map((rule) => rule.untilHours).filter(Number.isFinite),
      ...[prediction.evidence.intervalDistribution?.regime?.endsAt].filter(Boolean).map((at) => (Date.parse(at) - origin) / HOUR2)
    ].filter((boundary) => boundary > from && boundary < to), to].sort((a, b) => a - b);
    for (let stamp = (Math.floor((origin + from * HOUR2) / SLOT) + 1) * SLOT; stamp < origin + to * HOUR2; stamp += SLOT)
      cuts.push((stamp - origin) / HOUR2);
    cuts.sort((a, b) => a - b);
    let hazard2 = 0;
    for (let index = 1; index < cuts.length; index++) {
      const a = cuts[index - 1], b = cuts[index];
      const before = baseProbability(a), after = baseProbability(b);
      if (before >= 1) return 0;
      if (after >= 1) return Infinity;
      const stamp = origin + (a + b) / 2 * HOUR2, day = clockDay(stamp, clock), local = parts(stamp, clock);
      const weight = clock.quarterHourWeights[Math.floor((local.hour * 60 + local.minute) / 15)];
      const mean = day.prefix.at(-1) / (day.end - day.start);
      hazard2 += Math.max(0, Math.log1p(-before) - Math.log1p(-after)) * weight / mean;
    }
    return hazard2;
  };
  const slot = Math.floor(hours / stepHours);
  while (prefix.length <= slot) {
    const index = prefix.length - 1;
    prefix.push(prefix[index] + increment(index * stepHours, (index + 1) * stepHours));
  }
  const hazard = prefix[slot] + (hours > slot * stepHours ? increment(slot * stepHours, hours) : 0);
  return -Math.expm1(-hazard);
}
function resetReleaseAnchor({ lastReset, meanIntervalDays, now, notBefore = now, clock }) {
  if (!clock || !Number.isFinite(lastReset) || !Number.isFinite(meanIntervalDays)) return null;
  const base = lastReset + meanIntervalDays * DAY2;
  const target = Math.max(base, now, notBefore), p = parts(target, clock);
  const candidates = [-1, 0, 1, 2].map((offset) => zonedStamp(Date.UTC(
    p.year,
    p.month - 1,
    p.day + offset,
    Math.floor(clock.typicalMinuteOfDay / 60),
    clock.typicalMinuteOfDay % 60
  ), clock)).filter((stamp) => stamp > now && stamp >= notBefore);
  const point = candidates.reduce((best, stamp) => Math.abs(stamp - target) < Math.abs(best - target) ? stamp : best);
  return { point, base };
}
function estimateResetTime({ lastReset, meanIntervalDays, now, notBefore = now, clock, probabilityByHours }) {
  const anchor = resetReleaseAnchor({ lastReset, meanIntervalDays, now, notBefore, clock });
  if (!anchor) return null;
  const { point, base } = anchor;
  const pointHours = (point - now) / HOUR2;
  const fromHours = Math.max(0, pointHours - clock.bandwidthMinutes / 60), toHours = pointHours + clock.bandwidthMinutes / 60;
  const earlier = probabilityByHours(fromHours), after = probabilityByHours(toHours);
  return {
    method: "last-reset-plus-recent-mean-aligned-to-release-clock",
    pointAt: new Date(point).toISOString(),
    pointHours,
    baseAt: new Date(Math.round(base)).toISOString(),
    meanAlreadyPassed: base <= now,
    from: new Date(Math.round(now + fromHours * HOUR2)).toISOString(),
    to: new Date(Math.round(now + toHours * HOUR2)).toISOString(),
    fromHours,
    toHours,
    nearbyHours: toHours - fromHours,
    probability: Math.max(0, after - earlier),
    earlierProbability: earlier,
    laterProbability: 1 - after,
    releaseTimeZone: clock.timeZone,
    typicalReleaseTime: clock.typicalTime,
    clockSampleCount: clock.sampleCount,
    clockWindowDays: clock.windowDays,
    clockSampleScope: clock.sampleScope
  };
}

// src/reset-sequence-forecast.js
var HOUR3 = 36e5;
var DAY3 = 24 * HOUR3;
var caches2 = /* @__PURE__ */ new WeakMap();
function renewalModel(prediction, now, resetAt = null) {
  if (!prediction) return null;
  const origin = new Date(now).getTime();
  const firstAt = resetAt ?? prediction.resetTimeMode?.pointAt ?? prediction.resetTimeEstimate?.pointAt;
  const first = Date.parse(firstAt), mean = prediction.evidence?.intervalModel?.meanIntervalDays;
  if (!Number.isFinite(first) || first < origin || !Number.isFinite(mean) || mean <= 0) return null;
  const sourceClock = prediction.releaseClock;
  const enforce = prediction.enforceResetCooldown ?? prediction.model === "local-recent-intervals-v5";
  const learned = prediction.evidence?.intervalDistribution;
  if (!caches2.has(prediction)) caches2.set(prediction, /* @__PURE__ */ new Map());
  const models = caches2.get(prediction), key = `${origin}:${first}`;
  const cached = models.get(key);
  if (cached?.origin === origin && cached.firstAt === firstAt && cached.mean === mean && cached.sourceClock === sourceClock && cached.enforce === enforce && cached.learned === learned) return cached;
  const cooldown = enforce ? resetCooldownRule({ lastReset: first, now: first, timeZone: sourceClock?.timeZone ?? prediction.timeZone ?? "UTC" }) : null;
  const blockedHours = cooldown?.untilHours ?? 0;
  const renewed = renewIntervalDistribution(learned, first);
  const survival = (age) => renewed ? intervalSurvival(renewed, age) : Math.exp(-age / mean);
  const factor = prediction.suppressedHazardFactor ?? SUPPRESSED_HAZARD_FACTOR;
  const initialSurvival = survival(blockedHours / 24);
  const suppressed = initialSurvival ** factor;
  const baseline = (hours) => hours <= blockedHours ? 1 - survival(hours / 24) ** factor : initialSurvival > 0 ? Math.max(0, Math.min(1, 1 - suppressed * survival(hours / 24) / initialSurvival)) : 1 - suppressed * Math.exp(-(hours - blockedHours) / 24 / mean);
  const renewal = {
    model: "local-recent-intervals-v5",
    releaseClock: sourceClock?.quarterHourWeights?.length === 96 ? { ...sourceClock, originAt: firstAt } : null,
    forecastWindows: [],
    evidence: { hardRules: cooldown ? [cooldown] : [], intervalDistribution: renewed }
  };
  const probability2 = (hours) => hours <= (first - origin) / HOUR3 ? 0 : renewal.releaseClock ? releaseClockProbability(renewal, hours - (first - origin) / HOUR3, baseline) : baseline(hours - (first - origin) / HOUR3);
  const result = { origin, first, firstAt, mean, sourceClock, enforce, learned, cooldown, probability: probability2 };
  models.set(key, result);
  return result;
}
function followingResetProbabilityByHours(prediction, now, hours, firstAt = null) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  return renewalModel(prediction, now, firstAt)?.probability(hours) ?? null;
}
function renewedResetProbabilityByHours(prediction, now, resetAt, hours) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  return renewalModel(prediction, now, resetAt)?.probability(hours) ?? null;
}
function followingResetDistribution({ prediction, now, firstAt = null }) {
  const model = renewalModel(prediction, now, firstAt);
  if (!model) return null;
  if (!model.distribution) model.distribution = hourlyResetDistribution({
    now,
    horizonHours: (model.first - model.origin) / HOUR3 + 336,
    probabilityByHours: model.probability
  });
  return model.distribution;
}
function followingResetEstimate({ prediction, now, firstAt: assumedAt = null }) {
  const firstAt = assumedAt ?? prediction?.resetTimeMode?.pointAt ?? prediction?.resetTimeEstimate?.pointAt;
  const first = Date.parse(firstAt), origin = new Date(now).getTime();
  const mean = prediction?.evidence?.intervalModel?.meanIntervalDays;
  if (!Number.isFinite(first) || !Number.isFinite(origin) || first <= origin || !Number.isFinite(mean) || mean <= 0) return null;
  const clock = prediction.releaseClock;
  const enforce = prediction.enforceResetCooldown ?? prediction.model === "local-recent-intervals-v5";
  const cooldown = enforce ? resetCooldownRule({
    lastReset: first,
    now: first,
    timeZone: clock?.timeZone ?? prediction.timeZone ?? prediction.displayTimeZone ?? "UTC"
  }) : null;
  const notBefore = Math.max(first + 1, cooldown ? Date.parse(cooldown.until) : first + 1);
  const base = first + mean * DAY3;
  const aligned = resetReleaseAnchor({ lastReset: first, meanIntervalDays: mean, now: first, notBefore, clock });
  const reference = aligned?.point ?? Math.max(base, notBefore);
  const mode = followingResetDistribution({ prediction, now, firstAt })?.mode;
  if (!mode) return null;
  const point = Date.parse(mode.pointAt);
  return {
    sequence: 2,
    conditional: true,
    conditionalOn: firstAt,
    ...mode,
    pointAt: new Date(Math.round(point)).toISOString(),
    pointHours: (point - origin) / HOUR3,
    baseAt: new Date(Math.round(base)).toISOString(),
    meanIntervalDays: mean,
    gapHours: (point - first) / HOUR3,
    meanReferenceAt: new Date(Math.round(reference)).toISOString(),
    method: "conditional-renewal-hour-window-density",
    probabilityBasis: "given-first-reset-at-reference",
    releaseTimeZone: clock?.timeZone ?? null,
    typicalReleaseTime: clock?.typicalTime ?? null,
    notBefore: new Date(Math.round(notBefore)).toISOString(),
    basis: "renewal-interval-and-release-clock-given-first-reset; not an unconditional second-event probability"
  };
}

// src/reset-campaign.js
var RESET_CAMPAIGNS = [{
  id: "codex-28-days-2026-10",
  name: "28 \u5929\u6539\u8FDB\u6216 reset",
  announcedAt: "2026-10-04T20:33:43.000Z",
  startsAt: "2026-10-05T07:00:00.000Z",
  endsAt: "2026-11-02T08:00:00.000Z",
  // Exclusive; Nov 1 includes the DST change.
  timeZone: "America/Los_Angeles",
  durationDays: 28,
  sourceUrl: "https://x.com/thsottiaux/status/2106845241357824205",
  dayOneSourceUrl: "https://x.com/thsottiaux/status/2107158998495748264",
  archiveUrl: "https://github.com/zarazhangrui/follow-builders/blob/main/feed-x.json",
  calendarBasis: "day-one-plus-announced-duration",
  sourceAccess: "public-post-archive; original X page returned 403"
}];
function describeResetCampaign(campaign, now) {
  if (!campaign) return null;
  const start = Date.parse(campaign.startsAt), end = Date.parse(campaign.endsAt);
  const announced = Date.parse(campaign.announcedAt), at = Number(now);
  if (![start, end, announced, at].every(Number.isFinite) || end <= start || announced > at)
    throw new Error("campaign \u9700\u8981\u6709\u6548\u7684\u516C\u544A\u65F6\u95F4\u4E0E\u8D77\u6B62\u65F6\u95F4\uFF0C\u4E14\u516C\u544A\u4E0D\u80FD\u665A\u4E8E\u5F53\u524D\u65F6\u95F4");
  new Intl.DateTimeFormat("en-CA", { timeZone: campaign.timeZone }).format(start);
  return { ...campaign, status: at < start ? "upcoming" : at < end ? "active" : "ended" };
}
function selectResetCampaign({ campaigns = RESET_CAMPAIGNS, now }) {
  const known = campaigns.filter((campaign) => Date.parse(campaign.announcedAt) <= Number(now)).map((campaign) => describeResetCampaign(campaign, now)).sort((a, b) => Date.parse(b.announcedAt) - Date.parse(a.announcedAt));
  return known.find((campaign) => campaign.status === "active") ?? known[0] ?? null;
}

// src/reset-event-time.js
var HOUR4 = 36e5;
var ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
var historical = /\b(?:last\s+(?:week|month|year)|yesterday|\d+\s+(?:days?|weeks?|months?)\s+ago|no\s+new\s+reset)\b|上周|上个月|去年|昨天|\d+天前|没有(?:宣布)?新(?:的)?重置/i;
var completed = /\b(?:have|has|just|already)\b.{0,35}\breset\b|\bwe['’]ve\s+reset\b|\breset\b.{0,35}\b(?:complete(?:d)?|done|finished|live|now|happened|rolled out)\b|\b(?:we|i)\s+reset\b|\b(?:limits?|quota|usage)\b.{0,25}\b(?:are|were|was|have been|has been)\s+reset\b|已(?:经)?(?:全部)?重置|重置(?:已)?完成/i;
var future = /\b(?:will|going to|plan to|tomorrow)\b.{0,45}\breset\b|将.*重置|明天.*重置/i;
function currentCompletion(text) {
  return text.split(/[.!?;\n，。；]|\b(?:and|but)\b/i).some((clause) => /\b(?:just|now|today)\b|刚刚|刚才|今天/i.test(clause) && completed.test(clause) && !historical.test(clause) && !future.test(clause));
}
function historicalResetReference(post) {
  const text = post.text ?? "";
  return /\bno\s+new\s+reset\b|\bnot\s+announc(?:e|ing)\b.{0,35}\breset\b|没有(?:宣布)?新(?:的)?重置/i.test(text) || historical.test(text) && !currentCompletion(text);
}
function completedResetEvent(post, now = Infinity) {
  const signal = post.signal;
  const published = Date.parse(post.createdAt);
  if (signal?.kind !== "reset_completed" || !Number.isFinite(signal.confidence) || signal.confidence < 0.8 || signal.confidence > 1 || !Number.isFinite(published) || published > now || historicalResetReference(post) || signal.resetTiming != null && signal.resetTiming !== "current") return null;
  const standalone = /^\s*(?:Day\s*\d+\s*[/：:]?\s*)?Reset[.!\s]*$/i.test(post.text ?? "");
  const replyDone = post.activityType === "reply" && /reset|重置/i.test(post.context ?? "") && /^\s*(?:done|all done|it's done|已完成|完成了)[.!。\s]*$/i.test(post.text ?? "");
  if (!completed.test(post.text ?? "") && !standalone && !replyDone) return null;
  if (future.test(post.text ?? "") && !currentCompletion(post.text ?? "")) return null;
  if (/\b(?:not|never|haven't|hasn't|didn't|won't)\b.{0,30}\breset\b|尚未重置|没有重置|不会重置/i.test(post.text ?? "")) return null;
  const literal = post.text?.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/)?.[0];
  const clockWithZone = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:UTC|GMT|PST|PDT)\b/i.test(post.text ?? "");
  const supplied = literal ? signal.resetOccurredAt ?? literal : clockWithZone ? signal.resetOccurredAt : void 0;
  if (supplied != null && (typeof supplied !== "string" || !ISO.test(supplied))) return null;
  const at = supplied == null ? published : Date.parse(supplied);
  if (!Number.isFinite(at) || at > published || at > now || at < published - 72 * HOUR4) return null;
  if (literal && supplied && Date.parse(literal) !== at) return null;
  return {
    at: new Date(at).toISOString(),
    reportedAt: new Date(published).toISOString(),
    timeBasis: supplied == null ? "announcement" : "explicit"
  };
}

// src/local-predictor.js
var suppressWith = (factor) => (probability2) => 1 - (1 - probability2) ** factor;
var DAY_MS = 864e5;
var clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
var oddsUpdate = (p, ratio) => {
  if (p <= 0 || p >= 1) return clamp(p, 0, 1);
  const odds = p / (1 - p);
  return odds * ratio / (1 + odds * ratio);
};
function dateMs(value, label) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) throw new Error(`${label} \u4E0D\u662F\u6709\u6548\u65F6\u95F4`);
  return time;
}
function hoursToLocalMidnight(nowMs, timeZone2) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone2,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch {
    throw new Error("\u65F6\u533A\u65E0\u6548");
  }
  const today2 = formatter.format(new Date(nowMs));
  let lo = nowMs, hi = nowMs + 27 * 36e5;
  if (formatter.format(new Date(hi)) === today2) throw new Error("\u65E0\u6CD5\u786E\u5B9A\u672C\u5730\u5348\u591C");
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (formatter.format(new Date(mid)) === today2) lo = mid;
    else hi = mid;
  }
  return Number(((hi - nowMs) / 36e5).toFixed(8));
}
function chanceFromAge(hazards, priorDaily, ageDays, durationDays, distribution = null) {
  if (distribution) {
    const before = intervalSurvival(distribution, ageDays), after = intervalSurvival(distribution, ageDays + durationDays);
    return before > 0 ? clamp(1 - after / before, 0, 1) : -Math.expm1(-durationDays / distribution.meanIntervalDays);
  }
  let survival = 1;
  let elapsed = 0;
  while (elapsed < durationDays - 1e-10) {
    const age = ageDays + elapsed;
    const bin = Math.floor(age);
    const span = Math.min(durationDays - elapsed, bin + 1 - age);
    survival *= (1 - (hazards[bin] ?? priorDaily)) ** span;
    elapsed += span;
  }
  return 1 - survival;
}
function postEffects(posts, nowMs, elapsedDays, lastResetMs) {
  let strongestHint = 0, strongestFeature = 0, strongestAnnouncement = 0;
  for (const post of posts) {
    const ageHours = (nowMs - dateMs(post.createdAt, "\u5E16\u5B50\u65F6\u95F4")) / 36e5;
    if (ageHours < 0 || ageHours >= 72 || lastResetMs !== void 0 && dateMs(post.createdAt, "\u5E16\u5B50\u65F6\u95F4") <= lastResetMs) continue;
    const signal = post.signal;
    if (!signal || ![
      "reset_hint",
      "reset_planned",
      "reset_completed",
      "banked_credit",
      "new_feature",
      "irrelevant",
      "unknown"
    ].includes(signal.kind) || !Number.isFinite(signal.confidence) || signal.confidence < 0 || signal.confidence > 1) {
      throw new Error("\u5E16\u5B50\u9700\u8981\u6709\u6548\u7684 LLM \u5206\u7C7B kind \u548C 0\u20131 confidence");
    }
    if (signal.kind === "reset_planned") {
      const validUntilMs = signal.validUntil === void 0 ? dateMs(post.createdAt, "\u5E16\u5B50\u65F6\u95F4") + DAY_MS : dateMs(signal.validUntil, "\u9884\u544A\u622A\u6B62\u65F6\u95F4");
      if (validUntilMs <= nowMs + elapsedDays * DAY_MS) continue;
    }
    const strength = signal.confidence * clamp(1 - (ageHours + elapsedDays * 24) / 72, 0, 1);
    if (signal.kind === "reset_hint") strongestHint = Math.max(strongestHint, strength);
    if (signal.kind === "new_feature" && !campaignFeature(post)) strongestFeature = Math.max(strongestFeature, strength);
    if (signal.kind === "reset_planned") strongestAnnouncement = Math.max(strongestAnnouncement, strength);
  }
  return {
    hint: strongestHint,
    feature: strongestFeature,
    announcement: strongestAnnouncement,
    ratio: 3 ** strongestHint * 0.25 ** strongestFeature * 30 ** strongestAnnouncement
  };
}
function predictReset({
  now,
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  resetTimes = [],
  posts = [],
  priorDailyProbability,
  campaignTimeZone = timeZone2,
  campaign = null,
  enforceResetCooldown = true,
  suppressedHazardFactor = SUPPRESSED_HAZARD_FACTOR
} = {}) {
  const nowMs = dateMs(now, "\u5F53\u524D\u65F6\u95F4");
  if (typeof enforceResetCooldown !== "boolean") throw new Error("enforceResetCooldown \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
  if (!Number.isFinite(suppressedHazardFactor) || suppressedHazardFactor < 0 || suppressedHazardFactor > 1)
    throw new Error("suppressedHazardFactor \u5FC5\u987B\u5728 0\u20131 \u4E4B\u95F4");
  const suppress = suppressWith(suppressedHazardFactor);
  if (!Array.isArray(resetTimes) || !Array.isArray(posts)) throw new Error("\u5386\u53F2 reset \u4E0E\u5E16\u5B50\u5FC5\u987B\u662F\u6570\u7EC4");
  const times = resetTimes.map((value, i) => dateMs(value, `\u5386\u53F2 reset ${i + 1}`));
  if (times.some((time, i) => time > nowMs || i && time <= times[i - 1])) {
    throw new Error("\u5386\u53F2 reset \u9700\u8981\u6309\u65F6\u95F4\u9012\u589E\uFF0C\u4E14\u4E0D\u80FD\u665A\u4E8E\u5F53\u524D\u65F6\u95F4");
  }
  const intervals = times.slice(1).map((time, i) => (time - times[i]) / DAY_MS);
  if (priorDailyProbability !== void 0 && (!Number.isFinite(priorDailyProbability) || priorDailyProbability <= 0 || priorDailyProbability >= 1)) {
    throw new Error("\u624B\u52A8\u5148\u9A8C\u65E5\u6982\u7387\u5FC5\u987B\u5728 0\u20131 \u4E4B\u95F4");
  }
  if (intervals.length < 3 && priorDailyProbability === void 0) {
    throw new Error("\u81F3\u5C11\u9700\u8981\u56DB\u6B21\u5DF2\u786E\u8BA4 reset\uFF0C\u6216\u663E\u5F0F\u63D0\u4F9B\u624B\u52A8\u5148\u9A8C\u65E5\u6982\u7387");
  }
  if (posts.some((post) => {
    const completion = completedResetEvent(post, nowMs);
    return completion && dateMs(completion.at, "\u91CD\u7F6E\u53D1\u751F\u65F6\u95F4") > (times.at(-1) ?? -Infinity) + 36e5;
  })) {
    throw new Error("\u5E16\u5B50\u62A5\u544A reset \u5DF2\u5B8C\u6210\uFF1B\u5148\u66F4\u65B0\u5386\u53F2 reset \u65F6\u95F4\u548C\u5F53\u524D\u8D26\u6237\u989D\u5EA6\uFF0C\u518D\u9884\u6D4B\u4E0B\u4E00\u6B21");
  }
  const ageDays = times.length ? (nowMs - times.at(-1)) / DAY_MS : null;
  campaign = describeResetCampaign(campaign, nowMs);
  const campaignActive = campaign?.status === "active";
  const forecastTimeZone = campaign?.timeZone ?? campaignTimeZone;
  const frequency = resetIntervalModel(intervals.length >= 3 ? times : [], nowMs, forecastTimeZone, priorDailyProbability, campaign);
  if (!Number.isFinite(frequency.daily)) throw new Error("\u4E0D\u540C\u65E5\u671F\u7684 reset \u8BB0\u5F55\u4E0D\u8DB3\uFF0C\u9700\u8981\u8865\u5145\u5386\u53F2\u6216\u663E\u5F0F\u63D0\u4F9B\u5148\u9A8C");
  const todayEndHours = hoursToLocalMidnight(nowMs, forecastTimeZone);
  const firstDays = todayEndHours / 24;
  const secondDays = (48 - todayEndHours) / 24;
  const { daily, hazards, distribution, ...intervalSummary } = frequency;
  intervalSummary.smoothing = distribution ? {
    method: distribution.method,
    bandwidthDays: distribution.bandwidthDays,
    priorEquivalentIntervals: distribution.priorEquivalentIntervals
  } : null;
  const currentAge = ageDays ?? 0;
  const localDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: forecastTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const cooldownRule = enforceResetCooldown ? resetCooldownRule({ lastReset: times.at(-1), now: nowMs, timeZone: forecastTimeZone }) : null;
  const cooldown = cooldownRule ? { ...cooldownRule, hazardFactor: suppressedHazardFactor } : null;
  const feature = posts.filter((post) => campaignFeature(post) && dateMs(post.createdAt, "\u5E16\u5B50\u65F6\u95F4") <= nowMs && localDay.format(new Date(post.createdAt)) === localDay.format(new Date(nowMs))).sort((a, b) => dateMs(b.createdAt, "\u5E16\u5B50\u65F6\u95F4") - dateMs(a.createdAt, "\u5E16\u5B50\u65F6\u95F4"))[0];
  const blockedToday = !!feature || !!cooldown;
  const rule = feature ? {
    kind: "campaign-feature-day",
    day: campaignDay(feature),
    sourceUrl: feature.sourceUrl ?? null,
    applied: true,
    hazardFactor: suppressedHazardFactor,
    until: new Date(Math.round(nowMs + todayEndHours * 36e5)).toISOString(),
    untilHours: todayEndHours,
    basis: "user-requested-hard-assumption",
    timeZone: forecastTimeZone
  } : null;
  const hardRules = [...rule ? [rule] : [], ...cooldown ? [cooldown] : []];
  const todayBase = chanceFromAge(hazards, daily, currentAge, firstDays, distribution);
  const baseline = [
    blockedToday ? suppress(todayBase) : todayBase,
    chanceFromAge(hazards, daily, currentAge + firstDays, secondDays, distribution)
  ];
  const signals = [
    postEffects(posts, nowMs, 0, times.at(-1)),
    postEffects(posts, nowMs, firstDays, times.at(-1))
  ];
  const windowsEnd = Math.max(48, cooldown?.untilHours ?? 0);
  const boundaries = [0, todayEndHours, 48, windowsEnd, ...cooldown ? [cooldown.untilHours] : [], ...posts.filter((post) => post.signal?.kind === "reset_planned").map((post) => (dateMs(post.signal.validUntil ?? new Date(dateMs(post.createdAt, "\u5E16\u5B50\u65F6\u95F4") + DAY_MS).toISOString(), "\u9884\u544A\u622A\u6B62\u65F6\u95F4") - nowMs) / 36e5).filter((hour) => hour > 0 && hour < 48)].sort((a, b) => a - b).filter((hour, index, array) => !index || Math.abs(hour - array[index - 1]) > 1e-7);
  const forecastWindows = boundaries.slice(1).map((endHours, index) => {
    const startHours = boundaries[index], base = chanceFromAge(hazards, daily, currentAge + startHours / 24, (endHours - startHours) / 24, distribution);
    const effect = postEffects(posts, nowMs, startHours / 24, times.at(-1));
    const blocked = !!feature && startHours < todayEndHours || cooldown && startHours < cooldown.untilHours - 1e-8;
    return { startHours, endHours, baselineProbability: base, probability: blocked ? suppress(base) : oddsUpdate(base, effect.ratio), ...blocked ? { suppressed: true } : {} };
  });
  const prediction = {
    model: "local-recent-intervals-v5",
    calibrated: false,
    todayEndHours,
    enforceResetCooldown,
    suppressedHazardFactor,
    timeZone: forecastTimeZone,
    displayTimeZone: timeZone2,
    forecastWindows,
    releaseClock: fitResetReleaseClock({ times, now: nowMs, timeZone: forecastTimeZone }),
    evidence: { daysSinceReset: ageDays, dailyFrequency: daily, ageHazards: hazards, intervalDistribution: distribution, hardRules }
  };
  const todayProbability = resetProbabilityByHours(prediction, todayEndHours);
  const next48 = resetProbabilityByHours(prediction, 48);
  const laterGivenNoReset = (next48 - todayProbability) / Math.max(Number.EPSILON, 1 - todayProbability);
  const laterProbability = (1 - todayProbability) * laterGivenNoReset;
  const next48Probability = todayProbability + laterProbability;
  Object.assign(prediction, {
    horizonHours: 48,
    todayProbability,
    laterGivenNoReset,
    next48Probability,
    todayEndHours,
    events: [
      { inHours: todayEndHours, probability: todayProbability },
      { inHours: 48, probability: laterProbability }
    ],
    evidence: {
      observedIntervals: intervals.length,
      daysSinceReset: ageDays,
      baselineDaily: baseline,
      signalEffects: signals,
      recentEventDays: frequency.recentEventDays,
      recentCoverageDays: frequency.recentCoverageDays,
      dailyFrequency: daily,
      ageHazards: hazards,
      intervalDistribution: distribution,
      source: frequency.source,
      intervalModel: intervalSummary,
      hardRules,
      campaignActive,
      campaign
    }
  });
  const quantile = (probability2) => {
    let lo = 0, hi = 24;
    while (resetProbabilityByHours(prediction, hi) < probability2 && hi < 8760) hi = Math.min(8760, hi * 2);
    if (resetProbabilityByHours(prediction, hi) < probability2) return null;
    for (let i = 0; i < 45; i++) {
      const mid = (lo + hi) / 2;
      if (resetProbabilityByHours(prediction, mid) < probability2) lo = mid;
      else hi = mid;
    }
    return new Date(Math.round(nowMs + hi * 36e5)).toISOString();
  };
  prediction.nextResetWindow = {
    coverage: 0.8,
    from: quantile(0.1),
    medianAt: quantile(0.5),
    to: quantile(0.9),
    basis: "conditional-model-prediction; not a guarantee or confidence interval for the mean"
  };
  prediction.resetTimingDistribution = resetTimingDistribution({
    now: nowMs,
    timeZone: timeZone2,
    probabilityByHours: (hours) => resetProbabilityByHours(prediction, hours)
  });
  prediction.resetTimeEstimate = estimateResetTime({
    lastReset: times.at(-1),
    meanIntervalDays: intervalSummary.meanIntervalDays,
    now: nowMs,
    notBefore: Math.max(nowMs, ...prediction.evidence.hardRules.filter((rule2) => rule2.applied && rule2.hazardFactor < 1).map((rule2) => Date.parse(rule2.until))),
    clock: prediction.releaseClock,
    probabilityByHours: (hours) => resetProbabilityByHours(prediction, hours)
  });
  prediction.resetTimeMode = hourlyResetDistribution({
    now: nowMs,
    probabilityByHours: (hours) => resetProbabilityByHours(prediction, hours)
  }).mode;
  prediction.followingResetEstimate = followingResetEstimate({ prediction, now: nowMs });
  return prediction;
}
function resetProbabilityByHours(prediction, hours) {
  if (!prediction || !Number.isFinite(hours) || hours < 0) return null;
  if (hours === 0) return 0;
  if (["local-recent-intervals-v4", "local-recent-intervals-v5"].includes(prediction.model) && prediction.releaseClock)
    return releaseClockProbability(prediction, hours, (value) => baseResetProbabilityByHours(prediction, value));
  return baseResetProbabilityByHours(prediction, hours);
}
function baseResetProbabilityByHours(prediction, hours) {
  if (hours === 0) return 0;
  if (["local-recent-intervals-v4", "local-recent-intervals-v5"].includes(prediction.model)) {
    const { ageHazards: hazards, dailyFrequency: daily2, daysSinceReset: age, intervalDistribution: distribution } = prediction.evidence;
    let survival = 1;
    for (const window2 of prediction.forecastWindows) {
      if (hours <= window2.startHours) break;
      const duration = (Math.min(hours, window2.endHours) - window2.startHours) / 24;
      const partial = chanceFromAge(hazards, daily2, (age ?? 0) + window2.startHours / 24, duration, distribution);
      const hazard = -Math.log1p(-window2.baselineProbability);
      const fraction = Number.isFinite(hazard) && hazard > 0 ? -Math.log1p(-partial) / hazard : duration * 24 / (window2.endHours - window2.startHours);
      survival *= (1 - window2.probability) ** fraction;
    }
    const futureStart = Math.max(48, prediction.forecastWindows.at(-1)?.endHours ?? 0, ...(prediction.evidence.hardRules ?? []).filter((rule) => rule.applied && rule.probability === 0).map((rule) => rule.untilHours ?? 0));
    if (hours > futureStart) survival *= 1 - chanceFromAge(hazards, daily2, (age ?? 0) + futureStart / 24, (hours - futureStart) / 24, distribution);
    return clamp(1 - survival, 0, 1);
  }
  const first = prediction.todayEndHours;
  const pToday = prediction.todayProbability;
  const pLater = prediction.laterGivenNoReset;
  if (![first, pToday, pLater].every(Number.isFinite) || first <= 0 || first >= 48) return null;
  const segmentChance = (p, fraction) => 1 - (1 - p) ** fraction;
  if (hours <= first) return segmentChance(pToday, hours / first);
  const survivingToday = 1 - pToday;
  if (hours <= 48) return 1 - survivingToday * (1 - segmentChance(pLater, (hours - first) / (48 - first)));
  const daily = prediction.evidence?.dailyFrequency;
  if (!Number.isFinite(daily) || daily < 0 || daily > 1) return null;
  const futureChance = chanceFromAge(
    prediction.evidence?.ageHazards ?? [],
    daily,
    (prediction.evidence?.daysSinceReset ?? 0) + 2,
    (hours - 48) / 24
  );
  return 1 - (1 - prediction.next48Probability) * (1 - futureChance);
}

// src/usage-strategy.js
var HOUR5 = 36e5;
var EPS = 1e-7;
var usageStrategies = Object.freeze([
  Object.freeze({ id: "balanced", label: "\u4FDD\u6301\u8282\u594F", description: "\u6309\u5F53\u524D\u901F\u5EA6\u7528\uFF0C\u770B\u4EC0\u4E48\u65F6\u5019\u7528\u5B8C" }),
  Object.freeze({ id: "keep-available", label: "\u4FDD\u6301\u53EF\u7528", description: "\u5C3D\u91CF\u4E00\u76F4\u6709\u989D\u5EA6\uFF0C\u5FC5\u8981\u65F6\u653E\u6162" }),
  Object.freeze({ id: "maximize", label: "\u4E0D\u6D6A\u8D39\u989D\u5EA6", description: "\u5728\u4E0B\u6B21\u8865\u6EE1\u524D\u521A\u597D\u7528\u5B8C" }),
  Object.freeze({ id: "weekdays", label: "\u5468\u672B\u4E0D\u4F7F\u7528", description: "\u5468\u672B\u4F11\u606F\uFF0C\u989D\u5EA6\u5206\u7ED9\u5DE5\u4F5C\u65E5" }),
  Object.freeze({ id: "weekend-focus", label: "\u5468\u672B\u96C6\u4E2D\u4F7F\u7528", description: "\u4F18\u5148\u5728\u5468\u672B\u7528\u5B8C\u989D\u5EA6" })
]);
var validUsageStrategy = (value) => usageStrategies.some((strategy) => strategy.id === value);
function usageStrategyCalendar({ now, timeZone: timeZone2, horizonHours = 504 }) {
  const origin = Date.parse(now), format = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone2,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });
  const parts2 = (stamp) => Object.fromEntries(format.formatToParts(stamp).map((part) => [part.type, part.value]));
  const key = (stamp) => {
    const p = parts2(stamp);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const slots = [];
  for (let start = 0; start < horizonHours - EPS; ) {
    const stamp = origin + start * HOUR5, day = key(stamp);
    let low = stamp, high = stamp + 27 * HOUR5;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (key(mid) === day) low = mid;
      else high = mid;
    }
    const end = Math.min(horizonHours, (high - origin) / HOUR5);
    slots.push({ startHours: start, endHours: end, date: day, weekend: ["Sat", "Sun"].includes(parts2(stamp).weekday) });
    start = end;
  }
  return {
    slots,
    allocate({ strategy, start, end, quota, dailyCapacityPercent = null, cycleStart = start }) {
      const spans = slots.filter((slot) => slot.endHours > start + EPS && slot.startHours < end - EPS);
      const hasWeekend = slots.some((slot) => slot.weekend && slot.endHours > cycleStart + EPS && slot.startHours < end - EPS);
      const allowed = (slot) => strategy === "weekdays" ? !slot.weekend : strategy === "weekend-focus" && hasWeekend ? slot.weekend : true;
      const availableHours = spans.reduce((sum, slot) => sum + (allowed(slot) ? Math.max(0, Math.min(end, slot.endHours) - Math.max(start, slot.startHours)) : 0), 0);
      const current = spans.find((slot) => slot.startHours <= start + EPS && slot.endHours > start + EPS);
      const active = !!current && allowed(current);
      let nextChange = end;
      for (const slot of spans) if (slot.startHours > start + EPS && allowed(slot) !== active) {
        nextChange = slot.startHours;
        break;
      }
      const needed = availableHours > EPS ? quota * 24 / availableHours : 0;
      return {
        dailyPercent: active ? Math.min(needed, dailyCapacityPercent ?? Infinity) : 0,
        availableHours,
        nextChange,
        rest: !active,
        requiredDailyPercent: needed
      };
    }
  };
}

// src/availability-goal.js
var HOUR6 = 36e5;
var EPS2 = 1e-7;
var availabilityDefaults = Object.freeze({ bufferPercent: 5 });
var validAvailabilityMode = (value) => ["cautious", "optimistic"].includes(value);
function availabilityPace({
  quota,
  time,
  normalHour,
  targetDailyPercent,
  forecastHour = null,
  bankDeadline = null,
  forecastMissed = false
}) {
  const reserve = Math.min(availabilityDefaults.bufferPercent, quota * 0.2);
  const knownDeadline = Math.min(normalHour, bankDeadline ?? Infinity);
  const useForecast = !forecastMissed && forecastHour !== null && forecastHour > time + EPS2 && forecastHour < knownDeadline - EPS2 && quota > availabilityDefaults.bufferPercent + EPS2;
  const deadline = useForecast ? forecastHour : knownDeadline;
  const capacity = targetDailyPercent * (bankDeadline !== null && deadline === bankDeadline ? 2 : 1);
  return {
    dailyPercent: quota > EPS2 && deadline > time + EPS2 ? Math.min(capacity, Math.max(0, quota - reserve) * 24 / (deadline - time)) : 0,
    deadline,
    reserve,
    usesForecast: useForecast,
    reason: useForecast ? "availability-forecast-budget" : forecastMissed ? "availability-missed-forecast" : "availability-known-supply"
  };
}
function assessAvailability({ base, first, trace, mode, targetDailyPercent, probabilityByHours, alertsEnabled }) {
  const origin = Date.parse(base.now), at = (h) => new Date(origin + h * HOUR6).toISOString();
  const consumptionHours = base.remainingPercent * 24 / targetDailyPercent;
  const early = consumptionHours < base.normalResetInHours - EPS2;
  const point = first?.availability ?? null;
  const deadline = point?.deadline ?? base.normalResetInHours;
  const p = early && probabilityByHours ? probabilityByHours(Math.max(0, consumptionHours)) : 0;
  const cdf = (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
  const status = base.remainingPercent <= EPS2 ? "empty" : targetDailyPercent > (first?.dailyPercent ?? 0) + EPS2 ? "too-fast" : "on-track";
  const fallback = trace.segments.find((segment) => segment.startHours >= deadline - EPS2 && segment.reason === "availability-missed-forecast");
  return {
    goal: "keep-available",
    mode,
    bufferPercent: availabilityDefaults.bufferPercent,
    status,
    currentDailyPercent: targetDailyPercent,
    suggestedDailyPercent: first?.dailyPercent ?? 0,
    reviewAt: at(deadline),
    reserveTarget: point?.reserve ?? Math.min(availabilityDefaults.bufferPercent, base.remainingPercent * 0.2),
    reserveAtReview: Math.max(0, (first?.remainingBefore ?? base.remainingPercent) - (first?.dailyPercent ?? 0) * deadline / 24),
    forecastUsed: point?.usesForecast ?? false,
    forecastRule: mode === "optimistic" ? "shared-confident-reset-rule" : null,
    probabilityOfResetByReview: probabilityByHours ? cdf(probabilityByHours(deadline)) : null,
    currentPaceDepletionAt: early ? at(consumptionHours) : null,
    // This is a first-event probability before a fixed depletion time. It is
    // not the chance of an outage under the adaptive plan or bank fallback.
    noResetBeforeCurrentPaceDepletion: early ? cdf(p) === null ? null : 1 - cdf(p) : 0,
    ifNoReset: point?.usesForecast ? {
      at: at(deadline),
      dailyPercent: fallback?.dailyPercent ?? null,
      action: "reduce-and-replan",
      normalRefreshAt: base.normalResetAt
    } : null,
    notification: {
      enabled: alertsEnabled,
      shouldNotify: alertsEnabled && status !== "on-track",
      trigger: "on-plan-check",
      code: status === "empty" ? "quota-empty" : status === "too-fast" ? "pace-too-fast" : null
    }
  };
}

// src/reset-policy-search.js
var HOUR7 = 36e5;
var WEEK = 168;
var EPS3 = 1e-7;
var OUTAGE_DAY_COST = 2;
var clamp2 = (value) => Math.max(0, Math.min(1, value));
var resetPolicyObjective = Object.freeze({
  interruptionPerDay: OUTAGE_DAY_COST,
  paceDeviationPerDay: 0.35,
  futureResourceValue: 0.65,
  overwriteCost: 0.05,
  bankOptionLossCost: OUTAGE_DAY_COST,
  bankScarcityCost: 0.65,
  nearTermHours: 48,
  nearTermInterruptionPerDay: OUTAGE_DAY_COST,
  horizonHours: 336
});
var resetAssumptionRule = Object.freeze({ countProbability: 0.6, timingQuantile: 0.75, maximumCount: 2 });
var LAST_BANK_MINIMUM_OUTAGE_HOURS = 24;
var MAXIMUM_SCHEDULED_DAILY_PERCENT = 100;
var FORECAST_BANK_WAIT_CAP_HOURS = 48;
function confidentResetTimes({ prediction, now, normalHours, horizonHours = 336, count = "auto" }) {
  const origin = Date.parse(now), times = [], probabilities = [];
  if (!prediction || !Number.isFinite(origin) || count === 0) return { times, probabilities };
  const limit = count === "auto" ? resetAssumptionRule.maximumCount : count;
  let previous = null, windowEnd = normalHours;
  while (times.length < limit) {
    const raw = (hours) => previous === null ? resetProbabilityByHours(prediction, hours) : renewedResetProbabilityByHours(prediction, now, new Date(origin + previous * HOUR7).toISOString(), hours);
    const cdf = (hours) => raw(hours) ?? 0;
    const end = Math.floor(Math.min(windowEnd, horizonHours));
    if (previous !== null && raw(end) === null) {
      const following = prediction.followingResetEstimate;
      const gap = (Date.parse(following?.pointAt) - Date.parse(following?.conditionalOn ?? prediction.resetTimeMode?.pointAt)) / HOUR7;
      const hour = previous + gap;
      const probability3 = following?.cumulativeProbability ?? null;
      if (Number.isFinite(hour) && hour > previous + EPS3 && hour <= end && (count !== "auto" || probability3 >= resetAssumptionRule.countProbability)) {
        times.push(hour);
        probabilities.push(probability3);
      }
      break;
    }
    const probability2 = clamp2(cdf(end));
    if (probability2 <= EPS3 || count === "auto" && probability2 < resetAssumptionRule.countProbability) break;
    let at = null;
    for (let hour = Math.floor(previous ?? 0) + 1; hour <= end; hour++)
      if (cdf(hour) >= resetAssumptionRule.timingQuantile * probability2 - EPS3) {
        at = hour;
        break;
      }
    if (at === null) break;
    times.push(at);
    probabilities.push(probability2);
    previous = at;
    windowEnd = at + WEEK;
  }
  return { times, probabilities };
}
function publicResetScenarios({ prediction, now, horizonHours = 336, sampleCount = 64 }) {
  const origin = Date.parse(now), tables = /* @__PURE__ */ new Map();
  if (!Number.isFinite(origin) || !Number.isInteger(horizonHours) || horizonHours < 1 || horizonHours > 336 || !Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 256 || sampleCount & sampleCount - 1)
    throw new Error("Scenario sampling needs a valid time, 1\u2013336 hours, and a power-of-two sample count up to 256");
  const table = (previous) => {
    const key = previous ?? "first";
    if (tables.has(key)) return tables.get(key);
    const cdf = (hours) => prediction ? previous === null ? resetProbabilityByHours(prediction, hours) : renewedResetProbabilityByHours(prediction, now, new Date(origin + previous * HOUR7).toISOString(), hours) : 0;
    const values = [];
    for (let h = 0; h <= horizonHours; h++) {
      const value = cdf(h);
      values.push(Number.isFinite(value) ? clamp2(value) : values.at(-1) ?? 0);
    }
    tables.set(key, values);
    return values;
  };
  const invert = (values, u, after = 0) => {
    for (let h = Math.floor(after) + 1; h < values.length; h++) if (values[h] >= u && values[h] > values[h - 1] + EPS3)
      return Math.max(after + EPS3, h - 1 + (u - values[h - 1]) / (values[h] - values[h - 1]));
    return null;
  };
  const paths = [];
  for (let index = 0; index < (prediction ? sampleCount : 1); index++) {
    const events = [];
    let previous = null, weight = 1 / (prediction ? sampleCount : 1);
    for (let sequence = 0; sequence < horizonHours; sequence++) {
      const values = table(previous), mass = values.at(-1);
      if (mass < 1) paths.push({ weight: weight * (1 - mass), events: [...events] });
      weight *= mass;
      if (weight <= 0) break;
      const stride = [1, 37, 19, 53, 29, 43, 11][sequence % 7];
      const u = ((index * stride + sequence * 17) % sampleCount + 0.5) / sampleCount;
      const time = invert(values, u * mass, previous ?? 0);
      if (time === null || time >= horizonHours - EPS3) {
        paths.push({ weight, events: [...events] });
        break;
      }
      previous = Math.max((previous ?? -1) + 1, Math.ceil(time));
      if (previous >= horizonHours) {
        paths.push({ weight, events: [...events] });
        break;
      }
      events.push(previous);
    }
  }
  const merged = /* @__PURE__ */ new Map();
  for (const path of paths) {
    const key = path.events.join(",");
    if (merged.has(key)) merged.get(key).weight += path.weight;
    else merged.set(key, path);
  }
  const scenarios = [...merged.values()];
  return {
    scenarios,
    table,
    origin,
    horizonHours,
    method: "stratified-renewal-scenarios",
    resolutionHours: 1
  };
}
function confidentNextHour(values, time, normal, horizon) {
  const before = values[Math.min(values.length - 1, Math.floor(time))] ?? 0;
  const end = values[Math.min(values.length - 1, Math.floor(Math.min(normal, horizon)))] ?? before;
  if (before >= 1 - EPS3) return null;
  const probability2 = (end - before) / (1 - before);
  if (probability2 < resetAssumptionRule.countProbability) return null;
  return conditionalQuantile(values, time, resetAssumptionRule.timingQuantile * probability2, horizon);
}
function conditionalQuantile(values, start, q, horizon) {
  const before = values[Math.min(values.length - 1, Math.floor(start))] ?? 0;
  const target = before + (1 - before) * q;
  for (let h = Math.floor(start) + 1; h <= horizon; h++) if (values[h] >= target) return h;
  return null;
}
function simulateResetPolicy({
  base,
  policy,
  scenario,
  forecast,
  targetDailyPercent,
  heldResetIndices = [],
  requiredResetIndices = [],
  stopAtFirstNormal = false
}) {
  const horizon = forecast.horizonHours, at = (h) => new Date(forecast.origin + h * HOUR7).toISOString();
  const held = new Set(heldResetIndices), required = new Set(requiredResetIndices), used = /* @__PURE__ */ new Set(), expired = /* @__PURE__ */ new Set();
  const segments = [], events = [], publicEvents = scenario.events;
  let time = 0, quota = base.remainingPercent, normal = base.normalResetInHours, publicIndex = 0, lastPublic = null;
  let daily = targetDailyPercent, review = Infinity, bankNotBefore = null, publicCount = 0, plannedRest = false;
  let scheduleStart = 0, scheduleDeadline = null, availability = null, forecastMissed = false;
  const availableGoal = policy.usageStrategy === "keep-available";
  const scheduled = policy.usageStrategy && policy.usageStrategy !== "balanced" && !availableGoal;
  let calendar2 = null;
  if (scheduled) {
    const zone = base.timeZone ?? "UTC", calendars = forecast.calendars ??= /* @__PURE__ */ new Map();
    if (!calendars.has(zone)) calendars.set(zone, usageStrategyCalendar({
      now: base.now,
      timeZone: zone,
      horizonHours: horizon + WEEK
    }));
    calendar2 = calendars.get(zone);
  }
  let work = 0, pause = 0, restHours = 0, nearTermPause = 0, deviation = 0, overwritten = 0, firstNormal = null, quotaBankSource = null, bankOptionLost = 0, bankReserveSpent = 0;
  const loseBankOption = () => {
    if (quotaBankSource !== null) bankOptionLost += Math.min(
      quota,
      targetDailyPercent * Math.max(0, base.resets[quotaBankSource].expiresInHours - time) / 24
    );
    quotaBankSource = null;
  };
  const live = () => base.resets.map((reset, index) => ({ ...reset, index })).filter((reset) => !used.has(reset.index) && !expired.has(reset.index) && reset.expiresInHours > time + EPS3);
  const choosePace = () => {
    daily = targetDailyPercent;
    review = Infinity;
    plannedRest = false;
    if (availableGoal) {
      const deadlines = live().filter((reset) => !held.has(reset.index) && (required.has(reset.index) || policy.useExpiring)).map((reset) => Math.min(reset.expiresInHours - 1, normal - 1)).filter((hour) => hour > time + EPS3);
      const bankDeadline = deadlines.length ? Math.min(...deadlines) : null;
      const forecastHour = policy.availabilityMode === "optimistic" && !forecastMissed ? policy.referenceTimes ? policy.referenceTimes.find((hour) => hour > time + EPS3 && hour < normal - EPS3) ?? null : confidentNextHour(forecast.table(lastPublic), time, normal, horizon) : null;
      availability = availabilityPace({
        quota,
        time,
        normalHour: normal,
        targetDailyPercent,
        forecastHour,
        bankDeadline,
        forecastMissed
      });
      daily = Math.min(availability.dailyPercent, policy.dailyCapacityPercent ?? Infinity);
      availability = { ...availability, dailyPercent: daily };
      review = availability.deadline;
      return;
    }
    if (policy.referenceTimes || policy.quantile !== null) {
      const target = policy.referenceTimes ? policy.referenceTimes.find((hour) => hour > time + EPS3) ?? null : conditionalQuantile(forecast.table(lastPublic), time, policy.quantile, horizon);
      if (target !== null && target < normal - EPS3) review = target;
    }
    if (policy.useExpiring) {
      const bank = live().find((reset) => !held.has(reset.index) && reset.expiresInHours - 1 > time + EPS3 && reset.expiresInHours - 1 < normal - EPS3);
      if (bank) review = Math.min(review, bank.expiresInHours - 1);
    }
    if (scheduled) {
      let deadline = Math.min(review, normal, horizon);
      for (const reset of live()) if (!held.has(reset.index) && (required.has(reset.index) || policy.useExpiring)) {
        if (reset.expiresInHours - 1 > time + EPS3) deadline = Math.min(deadline, reset.expiresInHours - 1);
      }
      if (scheduleDeadline !== null && time < scheduleDeadline - EPS3) deadline = scheduleDeadline;
      else {
        scheduleStart = time;
        scheduleDeadline = deadline;
      }
      const allocation = calendar2.allocate({
        strategy: policy.usageStrategy,
        start: time,
        end: deadline,
        quota: quota > EPS3 ? quota : 100,
        dailyCapacityPercent: policy.dailyCapacityPercent ?? MAXIMUM_SCHEDULED_DAILY_PERCENT,
        cycleStart: scheduleStart
      });
      daily = allocation.dailyPercent;
      plannedRest = allocation.rest;
      review = Math.min(review, allocation.nextChange);
    }
  };
  choosePace();
  for (let guard = 0; time < horizon - EPS3; guard++) {
    if (guard > 4096) throw new Error("Reset policy did not advance");
    if (publicEvents[publicIndex] <= time + EPS3) {
      publicIndex++;
      publicCount++;
      lastPublic = time;
      loseBankOption();
      events.push({ kind: "public-reset", atHours: time, at: at(time), overwrittenPercent: quota, nextNormalResetAt: at(time + WEEK) });
      quota = 100;
      normal = time + WEEK;
      bankNotBefore = null;
      scheduleDeadline = null;
      forecastMissed = false;
      choosePace();
      continue;
    }
    if (normal <= time + EPS3) {
      loseBankOption();
      events.push({ kind: "normal-refresh", atHours: time, at: at(time), overwrittenPercent: quota, nextNormalResetAt: at(time + WEEK) });
      firstNormal ??= time;
      quota = 100;
      normal = time + WEEK;
      bankNotBefore = null;
      scheduleDeadline = null;
      forecastMissed = false;
      if (stopAtFirstNormal) break;
      choosePace();
      continue;
    }
    for (const reset of live()) if (reset.expiresInHours <= time + EPS3) expired.add(reset.index);
    if (scheduled && review <= time + EPS3) choosePace();
    const available = live().filter((reset) => !held.has(reset.index));
    const committed = available.find((reset) => required.has(reset.index) && Math.min(reset.expiresInHours - 1, normal - 1) <= time + EPS3);
    const expiring = policy.useExpiring ? available.find((reset) => reset.expiresInHours - 1 <= time + EPS3) : null;
    const bridge = policy.bankMode !== "reserve";
    const spendable = available.length > 1 || normal - time >= LAST_BANK_MINIMUM_OUTAGE_HOURS - EPS3;
    if (bridge && quota <= EPS3 && !plannedRest && bankNotBefore === null && available.length && spendable) {
      let wait = policy.waitHours;
      if (wait === "forecast") {
        const next = policy.referenceTimes ? policy.referenceTimes.find((hour) => hour > time + EPS3 && hour < normal - EPS3) ?? null : confidentNextHour(forecast.table(lastPublic), time, normal, horizon);
        wait = next === null ? 0 : Math.min(FORECAST_BANK_WAIT_CAP_HOURS, next - time);
      }
      bankNotBefore = time + wait;
    }
    const depleted = bridge && quota <= EPS3 && !plannedRest && bankNotBefore !== null && bankNotBefore <= time + EPS3 && available.length ? available.reduce((soonest, reset) => reset.expiresInHours < soonest.expiresInHours ? reset : soonest) : null;
    const bank = committed ?? expiring ?? depleted;
    if (bank) {
      const before2 = quota;
      bankReserveSpent += 100 / available.length * Math.min(
        1,
        targetDailyPercent * Math.max(0, bank.expiresInHours - time) / 2400
      );
      loseBankOption();
      events.push({
        kind: "backup",
        atHours: time,
        at: at(time),
        resetIndex: bank.index,
        expiresOn: bank.expiresOn,
        expiresAt: bank.expiresAt,
        overwrittenPercent: before2,
        reason: committed ? "committed-before-refresh" : expiring ? "expiry-deadline" : "quota-exhausted",
        required: !!committed,
        deadlineDriven: !!expiring,
        nextNormalResetAt: at(time + WEEK)
      });
      overwritten += before2;
      used.add(bank.index);
      quota = 100;
      quotaBankSource = bank.index;
      normal = time + WEEK;
      bankNotBefore = null;
      scheduleDeadline = null;
      choosePace();
      continue;
    }
    if (review <= time + EPS3) {
      if (availableGoal && availability?.usesForecast) forecastMissed = true;
      choosePace();
    }
    const deadlines = available.map((reset) => required.has(reset.index) ? Math.min(reset.expiresInHours - 1, normal - 1) : policy.useExpiring ? reset.expiresInHours - 1 : Infinity).filter((hour) => hour > time + EPS3);
    const depletion = quota > EPS3 && daily > EPS3 ? time + quota * 24 / daily : Infinity;
    const end = Math.min(
      horizon,
      normal,
      publicEvents[publicIndex] ?? Infinity,
      review,
      depletion,
      ...deadlines,
      ...base.resets.filter((_, index) => !used.has(index) && !expired.has(index)).map((reset) => reset.expiresInHours).filter((hour) => hour > time + EPS3),
      quota <= EPS3 && available.length && bankNotBefore > time + EPS3 ? bankNotBefore : Infinity
    );
    if (end <= time + EPS3) throw new Error("Invalid reset policy boundary");
    const before = quota, duration = end - time, consumed = quota > EPS3 ? Math.min(quota, daily * duration / 24) : 0;
    quota = Math.max(0, quota - consumed);
    work += consumed;
    if (plannedRest) restHours += duration;
    else if (before <= EPS3) {
      pause += duration;
      nearTermPause += Math.max(0, Math.min(end, resetPolicyObjective.nearTermHours) - time);
    } else if (!scheduled) deviation += (daily / targetDailyPercent - 1) ** 2 * duration / 24;
    segments.push({
      kind: plannedRest ? "rest" : before > EPS3 ? "quota" : "pause",
      reason: plannedRest ? "planned-rest" : before > EPS3 ? availability?.reason : "no-resource",
      ...availableGoal ? { availability } : {},
      startHours: time,
      endHours: end,
      startAt: at(time),
      endAt: at(end),
      multiplier: before > EPS3 ? daily / base.averagePercentPerDay : 0,
      dailyPercent: before > EPS3 ? daily : 0,
      remainingBefore: before,
      remainingAfter: quota
    });
    time = end;
    for (const [index, reset] of base.resets.entries()) if (!used.has(index) && !expired.has(index) && reset.expiresInHours <= time + EPS3) {
      expired.add(index);
      events.push({ kind: "expiry", resetIndex: index, atHours: time, at: at(time), expiresOn: reset.expiresOn });
    }
  }
  if (normal <= time + EPS3) {
    loseBankOption();
    events.push({ kind: "normal-refresh", atHours: time, at: at(time), overwrittenPercent: quota, nextNormalResetAt: at(time + WEEK) });
    firstNormal ??= time;
    quota = 100;
    normal = time + WEEK;
  }
  const remainingBanks = base.resets.filter((_, index) => !used.has(index) && !expired.has(index));
  let tailPause = 0;
  if (!stopAtFirstNormal && normal > time + EPS3) {
    const depletion = time + (quota > EPS3 ? quota * 24 / targetDailyPercent : 0);
    tailPause = Math.max(0, normal - depletion);
  }
  const futureBank = remainingBanks.reduce((sum, reset) => sum + Math.min(
    100,
    targetDailyPercent * Math.max(0, reset.expiresInHours - time) / 24
  ), 0);
  pause += tailPause;
  const utility = work / targetDailyPercent - resetPolicyObjective.interruptionPerDay * pause / 24 - resetPolicyObjective.nearTermInterruptionPerDay * nearTermPause / 24 - resetPolicyObjective.paceDeviationPerDay * deviation - resetPolicyObjective.overwriteCost * overwritten / targetDailyPercent - resetPolicyObjective.bankOptionLossCost * bankOptionLost / targetDailyPercent - resetPolicyObjective.bankScarcityCost * bankReserveSpent / targetDailyPercent + resetPolicyObjective.futureResourceValue * (quota + futureBank) / targetDailyPercent;
  return {
    utility,
    work,
    pauseHours: pause,
    restHours,
    nearTermPauseHours: nearTermPause,
    banksUsed: used.size,
    expiredUnused: expired.size,
    bankOptionLost,
    bankReserveSpent,
    bankUseProbability: used.size ? 1 : 0,
    pauseProbability: pause > EPS3 ? 1 : 0,
    bankBeforeOriginalRefreshProbability: events.some((event) => event.kind === "backup" && event.atHours < base.normalResetInHours - EPS3) ? 1 : 0,
    remainingQuota: quota,
    remainingBanks: remainingBanks.length,
    publicCount,
    segments,
    events,
    normalHour: stopAtFirstNormal && firstNormal !== null ? firstNormal : normal,
    endHours: time,
    endKind: firstNormal !== null && stopAtFirstNormal ? "normal-refresh" : "planning-horizon"
  };
}
function forecastFirstPlan({ base, prediction, search, heldResetIndices = [], requiredResetIndices = [], assumedResetCount = "auto" }) {
  if (!prediction || assumedResetCount === 0) return null;
  const origin = Date.parse(base.now);
  const { times, probabilities } = confidentResetTimes({
    prediction,
    now: base.now,
    normalHours: base.normalResetInHours,
    horizonHours: search.horizonHours,
    count: assumedResetCount
  });
  if (!times.length) return null;
  const forecast = publicResetScenarios({ prediction: null, now: base.now, horizonHours: search.horizonHours });
  const targetDailyPercent = search.targetDailyPercent;
  const scheduled = search.usageStrategy && search.usageStrategy !== "balanced";
  const availability = search.usageStrategy === "keep-available" ? { availabilityMode: "optimistic" } : {};
  const probe = simulateResetPolicy({
    base,
    policy: {
      quantile: null,
      bankMode: "reserve",
      waitHours: 0,
      useExpiring: false,
      ...scheduled ? { usageStrategy: search.usageStrategy, dailyCapacityPercent: search.dailyCapacityPercent, referenceTimes: times, ...availability } : {}
    },
    scenario: { events: times },
    forecast,
    targetDailyPercent,
    stopAtFirstNormal: true
  });
  const shortageHours = probe.segments.filter((segment) => segment.kind === "pause").reduce((sum, segment) => sum + segment.endHours - segment.startHours, 0);
  const covered = shortageHours < EPS3;
  const plans = covered ? [{ bankMode: "reserve", waitHours: 0, useExpiring: false }, { bankMode: "reserve", waitHours: 0, useExpiring: true }] : [...new Map(search.candidates.map(({ policy: policy2 }) => [
    `${policy2.bankMode}:${policy2.waitHours}:${policy2.useExpiring}`,
    policy2
  ])).values()];
  const alternatives = plans.map((plan) => {
    const policy2 = {
      ...plan,
      quantile: null,
      referenceTimes: times,
      usageStrategy: search.usageStrategy,
      dailyCapacityPercent: search.dailyCapacityPercent,
      ...availability
    };
    const outcome = simulateResetPolicy({
      base,
      policy: policy2,
      scenario: { events: times },
      forecast,
      targetDailyPercent,
      heldResetIndices,
      requiredResetIndices
    });
    return { policy: policy2, utility: outcome.utility, banksUsed: outcome.banksUsed, pauseHours: outcome.pauseHours };
  }).sort((a, b) => (availability.availabilityMode ? a.pauseHours - b.pauseHours : 0) || b.utility - a.utility || a.banksUsed - b.banksUsed);
  const policy = alternatives[0].policy;
  const trace = simulateResetPolicy({
    base,
    policy,
    scenario: { events: times },
    forecast,
    targetDailyPercent,
    heldResetIndices,
    requiredResetIndices,
    stopAtFirstNormal: true
  });
  let sequence = 0;
  trace.events = trace.events.map((event) => event.kind === "public-reset" ? { ...event, kind: "assumed-extra-reset", sequence: ++sequence, hypothetical: true } : event);
  const fallback = simulateResetPolicy({
    base,
    policy,
    scenario: { events: [] },
    forecast,
    targetDailyPercent,
    heldResetIndices,
    requiredResetIndices,
    stopAtFirstNormal: true
  });
  const firstSegment = trace.segments[0];
  return {
    conditional: true,
    basis: "predicted-extra-resets-first",
    policy,
    trace,
    fallback,
    alternatives,
    assumedResetTimes: trace.events.filter((event) => event.kind === "assumed-extra-reset").map((event) => event.at),
    assumption: { count: assumedResetCount, rule: { ...resetAssumptionRule }, probabilities: probabilities.slice(0, times.length) },
    coverage: { currentUsageCovered: covered, through: new Date(origin + times.at(-1) * HOUR7).toISOString(), shortageHours },
    firstAction: {
      dailyPercent: firstSegment?.dailyPercent ?? 0,
      until: firstSegment?.endAt ?? null,
      backupPolicy: policy.bankMode,
      bankWaitHours: policy.bankMode === "reserve" ? null : policy.waitHours
    }
  };
}
function searchResetPolicies({
  base,
  prediction,
  targetDailyPercent,
  heldResetIndices = [],
  requiredResetIndices = [],
  sampleCount = 64,
  horizonHours = 336,
  usageStrategy = "balanced",
  dailyCapacityPercent = null,
  includeBridgeAlternative = false,
  availabilityMode = "optimistic",
  alertsEnabled = false
}) {
  if (!validUsageStrategy(usageStrategy)) throw new Error("Unknown usage strategy");
  if (!validAvailabilityMode(availabilityMode)) throw new Error("Unknown availability mode");
  if (typeof alertsEnabled !== "boolean") throw new Error("Alerts must be enabled or disabled");
  if (dailyCapacityPercent !== null && (!Number.isFinite(dailyCapacityPercent) || dailyCapacityPercent <= 0))
    throw new Error("Daily capacity must be positive");
  if (!Number.isFinite(targetDailyPercent) || targetDailyPercent <= 0 || !Number.isFinite(base?.averagePercentPerDay) || base.averagePercentPerDay <= 0)
    throw new Error("Policy search needs positive observed and target daily usage");
  const forecast = publicResetScenarios({ prediction, now: base.now, sampleCount, horizonHours });
  const policies = [];
  const availableGoal = usageStrategy === "keep-available";
  const bankPlans = [
    ...(prediction && !availableGoal ? [0, 12, 24, "forecast"] : [0]).map((waitHours) => ({ bankMode: "bridge", waitHours })),
    { bankMode: "reserve", waitHours: 0 }
  ];
  const paced = usageStrategy !== "balanced" && !availableGoal;
  for (const quantile of prediction && paced ? [null, 0.35, 0.5, 0.75] : [null])
    for (const { bankMode, waitHours } of bankPlans) for (const useExpiring of [false, true])
      policies.push({
        id: `${quantile ?? "keep"}:${bankMode}:${waitHours}:${useExpiring}`,
        quantile,
        waitHours,
        useExpiring,
        bankMode,
        usageStrategy,
        dailyCapacityPercent,
        ...availableGoal ? { availabilityMode } : {}
      });
  const evaluate = (policy) => {
    const metrics = {
      utility: 0,
      work: 0,
      pauseHours: 0,
      nearTermPauseHours: 0,
      banksUsed: 0,
      expiredUnused: 0,
      bankOptionLost: 0,
      bankReserveSpent: 0,
      bankUseProbability: 0,
      pauseProbability: 0,
      bankBeforeOriginalRefreshProbability: 0
    };
    for (const scenario of forecast.scenarios) {
      const result = simulateResetPolicy({ base, policy, scenario, forecast, targetDailyPercent, heldResetIndices, requiredResetIndices });
      for (const key of Object.keys(metrics)) metrics[key] += result[key] * scenario.weight;
    }
    return { policy, expected: metrics };
  };
  const candidates = policies.map(evaluate).sort((a, b) => (availableGoal ? a.expected.pauseHours - b.expected.pauseHours : 0) || b.expected.utility - a.expected.utility || a.expected.pauseHours - b.expected.pauseHours || a.expected.banksUsed - b.expected.banksUsed);
  const selected = candidates[0];
  const fallback = simulateResetPolicy({
    base,
    policy: selected.policy,
    scenario: { events: [] },
    forecast,
    targetDailyPercent,
    heldResetIndices,
    requiredResetIndices,
    stopAtFirstNormal: true
  });
  const first = fallback.segments[0];
  const bridge = includeBridgeAlternative ? simulateResetPolicy({
    base,
    policy: { ...selected.policy, quantile: null, useExpiring: false, bankMode: "bridge", waitHours: 0 },
    scenario: { events: [] },
    forecast,
    targetDailyPercent: first?.dailyPercent > EPS3 ? first.dailyPercent : targetDailyPercent,
    heldResetIndices,
    requiredResetIndices,
    stopAtFirstNormal: true
  }) : null;
  const bridgeAlternative = bridge && Math.abs((bridge.segments[0]?.dailyPercent ?? 0) - (first?.dailyPercent ?? 0)) < EPS3 && bridge.segments[0]?.kind === first?.kind ? {
    segments: bridge.segments,
    events: bridge.events,
    normalHour: bridge.normalHour,
    endHours: bridge.endHours,
    endKind: bridge.endKind
  } : null;
  const baseline = availableGoal ? evaluate({
    id: "current-usage",
    quantile: null,
    bankMode: "reserve",
    waitHours: 0,
    useExpiring: false,
    usageStrategy: "balanced"
  }) : candidates.find((item) => item.policy.quantile === null && item.policy.waitHours === 0);
  return {
    method: "scenario-based-rolling-policy-search",
    optimality: "best-of-enumerated-feedback-policies",
    usageStrategy,
    dailyCapacityPercent,
    ...availableGoal ? { availability: assessAvailability({
      base,
      first,
      trace: fallback,
      mode: availabilityMode,
      targetDailyPercent,
      alertsEnabled,
      probabilityByHours: prediction ? (hours) => resetProbabilityByHours(prediction, hours) : null
    }) } : {},
    calibrated: prediction?.calibrated === true,
    forecastIncluded: !!prediction,
    objective: { ...resetPolicyObjective },
    horizonHours,
    sampleCount,
    scenarioCount: forecast.scenarios.length,
    ...includeBridgeAlternative ? { bridgeAlternative } : {},
    targetDailyPercent,
    firstAction: {
      dailyPercent: first?.dailyPercent ?? targetDailyPercent,
      until: first?.endAt ?? null,
      bankWaitHours: selected.policy.bankMode === "reserve" ? null : selected.policy.waitHours,
      backupPolicy: selected.policy.bankMode
    },
    selected,
    baseline,
    candidates,
    fallback,
    scenarioSummary: {
      noPublicResetProbability: forecast.scenarios.filter((path) => !path.events.length).reduce((sum, path) => sum + path.weight, 0),
      twoOrMoreProbability: forecast.scenarios.filter((path) => path.events.length >= 2).reduce((sum, path) => sum + path.weight, 0)
    },
    observationPolicy: "recompute-after-observed-reset-or-usage-change",
    probabilityBasis: "joint-sampled-renewal-histories; not second-curve-conditional-CDF"
  };
}

// src/reset-forecast.js
var DAY4 = 864e5;
function predictionFromArchive({ archive, now = /* @__PURE__ */ new Date(), timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
  const retrieved = Date.parse(`${archive?.retrievedAt}T00:00:00Z`);
  const age = (now.getTime() - retrieved) / DAY4;
  if (!Number.isFinite(age) || age < 0 || age > 14)
    return { available: false, reason: "\u5386\u53F2\u6570\u636E\u5DF2\u8FC7\u671F\uFF0C\u6682\u4E0D\u9884\u6D4B" };
  const resetTimes = [...new Set((archive.events ?? []).filter((event) => ["automatic", "automatic_and_banked"].includes(event.kind)).map((event) => event.at).filter((at) => Number.isFinite(Date.parse(at)) && Date.parse(at) <= now.getTime()))].sort((a, b) => Date.parse(a) - Date.parse(b));
  if (resetTimes.length < 4) return { available: false, reason: "\u5386\u53F2\u8BB0\u5F55\u4E0D\u8DB3\uFF0C\u6682\u4E0D\u9884\u6D4B" };
  const prediction = predictReset({
    now: now.toISOString(),
    timeZone: timeZone2,
    resetTimes,
    posts: archive.posts ?? [],
    campaignTimeZone: archive.campaignTimeZone ?? "America/Los_Angeles",
    campaign: selectResetCampaign({ campaigns: archive.campaigns, now: now.getTime() })
  });
  prediction.evidence.dataAsOf = archive.retrievedAt;
  prediction.evidence.liveCoverage = archive.coverage ?? null;
  const mention = archive.latestResetMention;
  const latestResetMention = mention && Number.isFinite(Date.parse(mention.createdAt)) && Date.parse(mention.createdAt) <= now.getTime() && /^https:\/\/(?:x|twitter)\.com\/thsottiaux\/status\/\d+(?:[?#].*)?$/.test(mention.sourceUrl) ? mention : null;
  prediction.evidence.latestResetMention = latestResetMention;
  return {
    available: true,
    prediction,
    dataAsOf: archive.retrievedAt,
    checkedAt: archive.checkedAt ?? null,
    coverage: archive.coverage ?? null,
    classification: archive.classification ?? null,
    classificationError: archive.classificationError ?? null,
    llmConfigured: archive.llmConfigured ?? false,
    latestResetMention,
    lastResetSource: archive.lastResetSource ?? null,
    lastResetAt: archive.lastResetAt ?? resetTimes.at(-1),
    daysSinceReset: (now.getTime() - Date.parse(resetTimes.at(-1))) / DAY4
  };
}
function conservativeResetTimes(result, prediction) {
  const origin = Date.parse(result.now);
  const normalAt = Date.parse(result.originalNormalResetAt ?? result.normalResetAt);
  if (!prediction || !Number.isFinite(origin) || !Number.isFinite(normalAt)) return [];
  return confidentResetTimes({ prediction, now: result.now, normalHours: (normalAt - origin) / 36e5, count: 2 }).times.map((hours) => new Date(Math.round(origin + hours * 36e5)).toISOString());
}
function strategyResetForecast(result, prediction) {
  if (!prediction) return { enabled: false, milestones: [] };
  const assumedFirstAt = result.recommendation?.primary?.assumedResetTimes?.[0] ?? conservativeResetTimes(result, prediction)[0] ?? null;
  const milestones = result.milestones.points.filter((point) => point.reasons.includes("depletion") || point.reasons.includes("backup")).map((point) => {
    const probability2 = resetProbabilityByHours(prediction, point.hours);
    return {
      hours: point.hours,
      at: point.at,
      probability: probability2,
      noResetProbability: 1 - probability2,
      kind: point.reasons.includes("backup") ? "backup" : "depletion",
      resetIndices: point.events.filter((event) => event.kind === "backup").map((event) => event.resetIndex)
    };
  });
  return {
    enabled: true,
    model: prediction.model ?? "provided-forecast",
    calibrated: prediction.calibrated === true,
    mostLikely: prediction.resetTimingDistribution?.mostLikely ?? null,
    timeEstimate: prediction.resetTimeEstimate ?? null,
    timeMode: prediction.resetTimeMode ?? null,
    // Condition the second curve on the first reset the plan assumes, if any.
    followingReset: assumedFirstAt ? followingResetEstimate({ prediction, now: result.now, firstAt: assumedFirstAt }) ?? prediction.followingResetEstimate ?? null : prediction.followingResetEstimate ?? followingResetEstimate({ prediction, now: result.now }),
    modeSearchDays: prediction.resetTimingDistribution?.searchDays ?? null,
    dataAsOf: prediction.evidence?.dataAsOf ?? null,
    probabilityBasis: "cumulative-from-plan-start",
    onReset: "replan-from-observed-balance",
    milestones
  };
}
function forecastAssumptionCards(result, prediction) {
  const HOUR16 = 36e5, EPS9 = 1e-7;
  const conservative = conservativeResetTimes(result, prediction);
  const mode = conservative[0] ? { ...prediction.resetTimeMode, pointAt: conservative[0] } : prediction?.resetTimeMode;
  const origin = Date.parse(result.now), hours = (Date.parse(mode?.pointAt) - origin) / HOUR16;
  if (!result.available || !mode || !Number.isFinite(hours) || hours <= EPS9 || hours > 336)
    return { available: false, selected: false, reason: "\u6682\u65E0\u53EF\u7528\u4E8E\u5047\u8BBE\u89C4\u5212\u7684\u6700\u53EF\u80FD reset \u65F6\u95F4" };
  const cumulative = (hour) => resetProbabilityByHours(prediction, hour) ?? 0;
  const following = result.resetForecast?.followingReset;
  const secondHours = (Date.parse(conservative[1] ?? following?.pointAt) - origin) / HOUR16;
  const first = { sequence: 1, at: mode.pointAt, hours, probability: mode.probability, cumulativeProbability: cumulative(hours) };
  return {
    available: true,
    selected: false,
    secondSelected: false,
    conditional: true,
    at: mode.pointAt,
    hours,
    probability: mode.probability,
    cumulativeProbability: first.cumulativeProbability,
    following: { available: Number.isFinite(secondHours) && secondHours > hours + EPS9, selected: false, ...following, hours: secondHours },
    assumptions: [{ ...first, selected: false }],
    onObservedReset: "replan-from-actual-account"
  };
}

// src/reset-forecast-summary.js
var escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
var number = (value) => Number.isFinite(value) ? Number(value.toFixed(2)) : null;
var postLabels = {
  reset_planned: "\u660E\u786E\u9884\u544A",
  reset_completed: "\u5DF2\u91CD\u7F6E\u8BB0\u5F55",
  reset_hint: "\u53EF\u80FD\u6697\u793A",
  banked_credit: "\u5907\u7528 reset",
  new_feature: "\u65B0\u529F\u80FD",
  irrelevant: "\u65E0\u91CD\u7F6E\u4FE1\u53F7",
  unknown: "\u6682\u672A\u8BC6\u522B"
};
var postUrl = (value) => /^https:\/\/(?:x|twitter)\.com\/thsottiaux\/status\/\d+(?:[?#].*)?$/.test(value ?? "");
function renderResetForecastSummary({
  source,
  prediction = null,
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  now = /* @__PURE__ */ new Date(),
  locale = "zh-CN"
} = {}) {
  const t2 = translator(locale);
  if (!source?.available) return `<p class="forecast-summary-unavailable" data-forecast-summary>${escape(diagnosticText(locale, source?.reason ?? "\u9884\u6D4B\u6570\u636E\u6682\u4E0D\u53EF\u7528"))}</p>`;
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone2,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts2 = (value) => Object.fromEntries(dateFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  const year = parts2(now).year;
  const format = (value) => {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    const p = parts2(value);
    return uiLocale(locale) === "zh-CN" ? `${p.year === year ? "" : p.year + "/"}${p.month}/${p.day} ${p.hour}:${p.minute}` : new Intl.DateTimeFormat(uiLocale(locale), { timeZone: timeZone2, month: "short", day: "numeric", ...p.year === year ? {} : { year: "numeric" }, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  };
  const row = (key, label, value, note = "") => `<div data-forecast-stat="${key}"><dt>${escape(t2(label))}</dt><dd>${value}${note ? `<small>${escape(note)}</small>` : ""}</dd></div>`;
  const model = source.prediction?.evidence?.intervalModel;
  const campaign = source.prediction?.evidence?.campaign;
  const mean = number(model?.meanIntervalDays);
  const confidence = model?.meanIntervalConfidence;
  const low = number(confidence?.lowDays), high = number(confidence?.highDays);
  const level = Number.isFinite(confidence?.level) ? Math.round(confidence.level * 100) : 95;
  const recent = model?.source === "recent-30-day-intervals";
  const campaignFit = model?.source === "campaign-intervals";
  const count = model?.sampleCount ?? (recent ? model.recentIntervalCount : model?.intervals?.length);
  const scope = campaignFit ? t2("\u672C\u6B21 campaign \xB7 {count} \u6B21 reset", { count: model.campaignEventCount }) : recent ? t2("\u8FD1 {days} \u5929", { days: model.windowDays }) : model?.source === "non-campaign-historical-intervals" ? t2("\u975E\u6D3B\u52A8\u5386\u53F2\u56DE\u9000") : t2("\u5386\u53F2\u56DE\u9000");
  const fallback = model?.selectionReason === "campaign-has-no-complete-interval" ? t2(" \xB7 \u6D3B\u52A8\u6837\u672C\u4E0D\u8DB3\uFF0C\u6682\u56DE\u9000") : "";
  const sample = mean === null ? "" : `${scope}${Number.isInteger(count) ? t2(" \xB7 {count} \u4E2A\u5B8C\u6574\u95F4\u9694", { count }) : ""}${fallback}`;
  const last = format(source.lastResetAt);
  const lastValue = last && postUrl(source.lastResetSource) ? `<a href="${escape(source.lastResetSource)}" target="_blank" rel="noopener noreferrer">${escape(last)}</a>` : escape(last ?? t2("\u6682\u65E0\u8BB0\u5F55"));
  const age = number(source.daysSinceReset);
  const rows = [
    row("last-reset", "\u4E0A\u6B21\u516C\u5F00 reset", lastValue, age === null ? "" : t2("{days} \u5929\u524D", { days: age })),
    row("mean-interval", "\u5E73\u5747 reset \u95F4\u9694", mean === null ? t2("\u6570\u636E\u4E0D\u8DB3") : t2("{days} \u5929", { days: mean }), sample),
    row("mean-confidence", t2("\u5747\u503C {level}% \u7F6E\u4FE1\u533A\u95F4", { level }), low === null || high === null ? t2("\u6837\u672C\u4E0D\u8DB3\uFF0C\u6682\u4E0D\u4F30\u8BA1") : t2("{low} \u2013 {high} \u5929", { low, high }))
  ];
  if (campaign) {
    const status2 = { active: "\u8FDB\u884C\u4E2D", upcoming: "\u5C1A\u672A\u5F00\u59CB", ended: "\u5DF2\u7ED3\u675F" }[campaign.status];
    const start = format(campaign.startsAt), end = format(campaign.endsAt);
    const value = postUrl(campaign.sourceUrl) ? `<a href="${escape(campaign.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(t2(campaign.name))}</a>` : escape(t2(campaign.name));
    rows.splice(1, 0, row(
      "campaign",
      "\u7279\u6B8A campaign",
      `${value} \xB7 ${escape(t2(status2))}`,
      t2("{start} \u8D77 \xB7 {end} \u7ED3\u675F\uFF08\u6309 Day 1 \u548C\u6D3B\u52A8\u5929\u6570\u63A8\u7B97\uFF09", { start, end })
    ));
  }
  const clock = source.prediction?.releaseClock;
  if (clock?.sampleScope === "all-history") {
    const localClock = clock.typicalTimeAt ? parts2(clock.typicalTimeAt) : null;
    rows.push(row(
      "release-clock",
      "\u5E38\u89C1\u53D1\u5E03\u949F\u70B9",
      escape(localClock ? `${localClock.hour}:${localClock.minute}` : clock.typicalTime),
      localClock && clock.timeZone && clock.timeZone !== timeZone2 ? t2("\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A reset \u65E5 \xB7 \u4F60\u7684\u65F6\u95F4\uFF1BTibo \u5F53\u5730 {local}", {
        count: clock.sampleCount,
        local: new Intl.DateTimeFormat("en-US", { timeZone: clock.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }).format(new Date(clock.typicalTimeAt))
      }) : t2("\u5168\u90E8\u5386\u53F2 \xB7 {count} \u4E2A reset \u65E5 \xB7 \u4F60\u7684\u65F6\u95F4", { count: clock.sampleCount })
    ));
  }
  if (prediction) {
    const estimate = prediction.resetTimeEstimate, mode = prediction.resetTimeMode;
    const window2 = prediction.nextResetWindow;
    const from = format(window2?.from), to = format(window2?.to);
    const coverage = Number.isFinite(window2?.coverage) ? Math.round(window2.coverage * 100) : 80;
    rows.push(
      mode ? row("next-reset-mode", "\u6700\u53EF\u80FD reset \u65F6\u95F4", escape(format(mode.pointAt))) : estimate ? row(
        "next-reset-estimate",
        "\u5E73\u5747\u95F4\u9694\u53C2\u8003\u65F6\u95F4",
        escape(format(estimate.pointAt)),
        t2("{scope} {count} \u6B21 \xB7 \u5E38\u89C1 {time}\uFF08{zone}\uFF09", { scope: estimate.clockSampleScope === "all-history" ? t2("\u5168\u90E8\u5386\u53F2") : t2("\u8FD1 {days} \u5929", { days: estimate.clockWindowDays }), count: estimate.clockSampleCount, time: estimate.typicalReleaseTime, zone: estimate.releaseTimeZone })
      ) : row("next-reset-median", "\u4E0B\u6B21\u9884\u8BA1\uFF08\u4E2D\u4F4D\uFF09", escape(format(window2?.medianAt) ?? t2("\u6682\u65E0\u6CD5\u4F30\u8BA1"))),
      row("next-reset-window", t2("\u4E0B\u6B21 {coverage}% \u9884\u6D4B\u7A97\u53E3", { coverage }), from && to ? `${escape(from)} \u2013 ${escape(to)}` : t2("\u6682\u65E0\u6CD5\u4F30\u8BA1"))
    );
    for (const rule of prediction.evidence?.hardRules ?? []) {
      const until = format(rule.until);
      if (!rule.applied || !until || Date.parse(rule.until) <= now.getTime()) continue;
      const label = rule.kind === "campaign-feature-day" ? t2("Day {day} \u529F\u80FD\u5E16", { day: rule.day }) : rule.kind === "reset-next-day-cooldown" ? t2("reset \u6B21\u65E5\u51B7\u5374\u671F") : t2("\u6D3B\u52A8\u65E5\u5185\u5DF2 reset");
      const strength = Number.isFinite(rule.probability) ? `${rule.probability * 100}%` : t2("\u964D\u5230\u5E73\u65F6\u7684 {percent}%", { percent: Math.round(rule.hazardFactor * 100) });
      rows.push(row(
        "active-rule",
        "\u5F53\u524D\u9884\u6D4B\u7EA6\u675F",
        `${escape(t2(label))} \xB7 ${escape(strength)}`,
        t2("\u622A\u81F3 {time}{rule}", { time: until, rule: rule.basis === "user-requested-hard-assumption" ? t2(" \xB7 \u7528\u6237\u8BBE\u5B9A\u89C4\u5219") : "" })
      ));
    }
  } else rows.push(row("prediction-disabled", "\u4E0B\u6B21 reset \u9884\u6D4B", t2("\u5DF2\u5173\u95ED")));
  const mention = source.latestPost ?? source.latestResetMention;
  if (mention && format(mention.createdAt) && postUrl(mention.sourceUrl)) {
    rows.push(row(
      "latest-post",
      source.latestPost ? mention.activityType === "reply" ? "Tibo \u6700\u8FD1\u56DE\u590D" : "Tibo \u6700\u8FD1\u5E16\u5B50" : mention.activityType === "reply" ? "Tibo \u6700\u8FD1\u76F8\u5173\u56DE\u590D" : "Tibo \u6700\u8FD1\u76F8\u5173\u5E16\u5B50",
      `<a href="${escape(mention.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(format(mention.createdAt))}</a> \xB7 ${escape(t2(postLabels[mention.signal?.kind] ?? "\u6682\u672A\u8BC6\u522B"))}<q>${escape(mention.text ?? "")}</q>`
    ));
  } else rows.push(row("latest-post", "Tibo \u76F8\u5173\u5E16\u5B50", t2("\u6682\u65E0\u53EF\u7528\u5E16\u5B50\uFF0F\u56DE\u590D")));
  const updated = format(source.checkedAt);
  const status = source.coverage?.history?.status === "live" ? t2("\u5B9E\u65F6\u8BB0\u5F55") : t2("\u7F13\u5B58 {date}", { date: source.dataAsOf ?? "" });
  const dayFormat = (value) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(
    uiLocale(locale),
    { timeZone: timeZone2, month: uiLocale(locale) === "zh-CN" ? "numeric" : "short", day: "numeric" }
  ).format(new Date(value)) : null;
  const glance = [];
  const glanceRow = (key, label, value) => glance.push(`<div data-forecast-glance="${key}"><dt>${escape(t2(label))}</dt><dd>${value}</dd></div>`);
  if (prediction && Number.isFinite(prediction.next48Probability))
    glanceRow("next-48h", "\u672A\u6765 48 \u5C0F\u65F6", escape(`${Number((prediction.next48Probability * 100).toFixed(1))}%`));
  const windowFrom = dayFormat(prediction?.nextResetWindow?.from), windowTo = dayFormat(prediction?.nextResetWindow?.to);
  if (windowFrom && windowTo) glanceRow("window", "\u53EF\u80FD\u7A97\u53E3", escape(windowFrom === windowTo ? windowFrom : `${windowFrom} \u2013 ${windowTo}`));
  if (last) {
    const hours = age === null ? null : Math.round(age * 24);
    const ago = hours === null ? "" : hours < 24 ? t2("{hours} \u5C0F\u65F6\u524D", { hours }) : t2("{days} \u5929\u524D", { days: Number(age.toFixed(1)) });
    const lastShort = postUrl(source.lastResetSource) ? `<a href="${escape(source.lastResetSource)}" target="_blank" rel="noopener noreferrer">${escape(dayFormat(source.lastResetAt))}</a>` : escape(dayFormat(source.lastResetAt));
    glanceRow("last-reset", "\u4E0A\u6B21 reset", `${lastShort}${ago ? ` \xB7 ${escape(ago)}` : ""}`);
  }
  if (campaign?.status === "active" && Number.isFinite(Date.parse(campaign.startsAt)) && Number.isFinite(Date.parse(campaign.endsAt))) {
    const DAY5 = 864e5, start = Date.parse(campaign.startsAt);
    const total = Math.round((Date.parse(campaign.endsAt) - start) / DAY5), day = Math.min(total, Math.floor((now.getTime() - start) / DAY5) + 1);
    glanceRow("campaign", "\u6D3B\u52A8", escape(t2("\u7B2C {day} / {total} \u5929 \xB7 {end} \u7ED3\u675F", { day, total, end: dayFormat(campaign.endsAt) })));
  }
  if (mention && format(mention.createdAt) && postUrl(mention.sourceUrl))
    glanceRow("tibo", "Tibo", `<a href="${escape(mention.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(t2(postLabels[mention.signal?.kind] ?? "\u6682\u672A\u8BC6\u522B"))} \xB7 ${escape(dayFormat(mention.createdAt))}</a>`);
  const statusLine = `<p>${escape(`${status}${updated ? t2(" \xB7 \u66F4\u65B0 {time}", { time: updated }) : ""} \xB7 ${t2("\u4F60\u7684\u65F6\u95F4\uFF08{zone}\uFF09", { zone: timeZone2 })}`)}${prediction ? ` \xB7 ${t2(prediction.calibrated === true ? "\u6A21\u578B\u9884\u6D4B" : "\u6A21\u578B\u672A\u6821\u51C6")}` : ""}</p>`;
  return `<section class="forecast-summary" data-forecast-summary aria-label="${t2("\u989D\u5916 reset \u9884\u6D4B\u5173\u952E\u6570\u636E")}">${glance.length ? `<dl class="forecast-glance">${glance.join("")}</dl>` : ""}<details class="forecast-more"><summary>${t2("\u66F4\u591A\u6570\u636E")}</summary><dl>${rows.join("")}</dl>${statusLine}</details></section>`;
}

// src/components/usage-strategies.js
function renderUsageStrategies({ selected = "balanced", locale = "en", disabled = false, after = {} } = {}, escape3 = String) {
  const t2 = translator(locale);
  return `<div class="usage-strategies" role="group" aria-label="${t2("\u7528\u91CF\u7B56\u7565")}">${usageStrategies.map((strategy) => `<button type="button" data-usage-strategy="${strategy.id}" aria-pressed="${selected === strategy.id}" title="${escape3(t2(strategy.description))}"${disabled ? " disabled" : ""}><strong>${escape3(t2(strategy.label))}</strong></button>${after[strategy.id] ?? ""}`).join("")}</div>`;
}

// src/components/availability-controls.js
function renderAvailabilityControls(availability, { locale = "en", mode = "optimistic", alertsEnabled = false, disabled = false } = {}, escape3 = String) {
  const t2 = translator(locale), date = (value) => new Intl.DateTimeFormat(uiLocale(locale), {
    timeZone: availability?.timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const n = (value) => Number(value.toFixed(1));
  return `<div class="availability-controls" data-availability-mode="${mode}">
    <div class="usage-strategies" role="group" aria-label="${t2("\u89C4\u5212\u503E\u5411")}">${[["cautious", "\u7A33\u59A5"], ["optimistic", "\u4E50\u89C2"]].map(([id, label]) => `<button type="button" data-availability-mode="${id}" aria-pressed="${mode === id}"${disabled ? " disabled" : ""}>${escape3(t2(label))}</button>`).join("")}</div>
    <small>${escape3(t2("\u4E50\u89C2\u8BA1\u5165\u9884\u6D4B\u7684 reset\uFF0C\u7A33\u59A5\u4E0D\u8BA1\u5165\uFF1B\u90FD\u9884\u7559\u7EA6 {buffer}%\u3002", { buffer: availability?.bufferPercent ?? 5 }))}</small>
    <button type="button" data-toggle-pace-alerts aria-pressed="${alertsEnabled}"${disabled ? " disabled" : ""}>${escape3(t2(alertsEnabled ? "\u68C0\u67E5\u65F6\u63D0\u9192\uFF1A\u5F00\u542F" : "\u68C0\u67E5\u65F6\u63D0\u9192\uFF1A\u5173\u95ED"))}</button>
    ${availability?.notification.shouldNotify ? `<p class="availability-alert" role="status">${escape3(availability.currentPaceDepletionAt ? t2("\u6309\u5F53\u524D\u7528\u91CF\uFF0C{time} \u8017\u5C3D\u3002", { time: date(availability.currentPaceDepletionAt) }) : t2("\u5F53\u524D\u7528\u91CF\u65E0\u6CD5\u4FDD\u7559\u76EE\u6807\u4F59\u91CF\u3002"))}</p>` : ""}
    ${availability?.ifNoReset?.dailyPercent !== null && availability?.ifNoReset ? `<p>${escape3(t2("\u82E5 {time} \u4ECD\u672A reset\uFF1A\u6539\u4E3A {daily}% / \u5929\u3002", {
    time: date(availability.ifNoReset.at),
    daily: n(availability.ifNoReset.dailyPercent)
  }))}</p>` : ""}
  </div>`;
}

// src/usage-consumption-summary.js
var HOUR8 = 36e5;
var round2 = (value) => Number(value.toFixed(2));
function usageConsumptionSummary(result, { locale = "zh-CN" } = {}) {
  const t2 = translator(locale);
  const refreshHours = (Date.parse(result.originalNormalResetAt ?? result.normalResetAt) - Date.parse(result.now)) / HOUR8;
  const elapsedHours = 168 - refreshHours, usedPercent = 100 - result.remainingPercent;
  const snapshotDaily = elapsedHours > 0 && usedPercent > 0 ? usedPercent * 24 / elapsedHours : null;
  const fromSnapshot = snapshotDaily !== null && Math.abs(snapshotDaily - result.averagePercentPerDay) < 1e-6;
  return {
    dailyPercent: result.averagePercentPerDay,
    remainingPercent: result.remainingPercent,
    refreshHours,
    elapsedHours,
    usedPercent,
    source: fromSnapshot ? "weekly-window-average" : "previous-observation",
    refreshLabel: t2("{days}\u5929 {hours}\u5C0F\u65F6", { days: Math.floor(refreshHours / 24), hours: round2(refreshHours % 24) }),
    calculationLabel: fromSnapshot ? t2("{used}% \xF7 {elapsed}\u5C0F\u65F6 \xD7 24", { used: round2(usedPercent), elapsed: round2(elapsedHours) }) : t2("\u6CBF\u7528\u4E0A\u6B21\u89C2\u6D4B\uFF0C\u672C\u8F6E\u6682\u4E0D\u8DB3\u4EE5\u4F30\u7B97")
  };
}

// src/intensity-plan.js
var HOUR9 = 36e5;
var EPS4 = 1e-8;
var intensityChoices = [
  { id: "steady", label: "\u4FDD\u6301\u5F53\u524D\u5F3A\u5EA6", multiplier: 1 },
  { id: "more", label: "\u589E\u52A0 50%", multiplier: 1.5 },
  { id: "flexible", label: "\u964D\u4F4E 50%", multiplier: 0.5 }
];
function number2(value, label, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value))
    throw new Error(`${label}\u5E94\u4E3A ${min}\u2013${max} \u4E4B\u95F4\u7684${integer ? "\u6574\u6570" : "\u6570\u5B57"}`);
  return value;
}
function expiryTime(value, timeZone2) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("\u5907\u7528 reset \u8BF7\u9009\u62E9\u6709\u6548\u5230\u671F\u65E5\u671F");
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day)
    throw new Error("\u5907\u7528 reset \u5230\u671F\u65E5\u671F\u65E0\u6548");
  const target = Date.UTC(year, month - 1, day + 1);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone2,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const parts2 = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    const local = Date.UTC(+parts2.year, +parts2.month - 1, +parts2.day, +parts2.hour, +parts2.minute, +parts2.second);
    const next = target - (local - candidate);
    if (next === candidate) break;
    candidate = next;
  }
  return candidate;
}
function planIntensityUsage({
  input: input2,
  now = /* @__PURE__ */ new Date(),
  prediction = null,
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  creditsPerPercent = null
} = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("\u5F53\u524D\u65F6\u95F4\u65E0\u6548");
  new Intl.DateTimeFormat("zh-CN", { timeZone: timeZone2 }).format(now);
  const remaining = number2(input2?.weeklyRemaining, "\u5468\u989D\u5EA6", 0, 100);
  const credits = number2(input2?.credits ?? 0, "Credits", 0, 1e6);
  const horizon = number2(input2?.weeklyResetDays, "\u5237\u65B0\u5269\u4F59\u5929\u6570", 0, 7, true) * 24 + number2(input2?.weeklyResetHours, "\u5237\u65B0\u5269\u4F59\u5C0F\u65F6", 0, 23, true);
  if (horizon <= 0 || horizon > 168) throw new Error("\u6B63\u5E38\u5237\u65B0\u9700\u4F4D\u4E8E\u672A\u6765\u4E00\u5468\u5185");
  if (creditsPerPercent !== null && (!Number.isFinite(creditsPerPercent) || creditsPerPercent <= 0))
    throw new Error("Credits \u6362\u7B97\u7387\u9700\u5927\u4E8E\u96F6");
  const dates = input2.resetDates ?? [];
  if (!Array.isArray(dates) || dates.length > 8 || new Set(dates).size !== dates.length)
    throw new Error("\u5907\u7528 reset \u6700\u591A 8 \u4E2A\uFF0C\u540C\u4E00\u5929\u6700\u591A\u4E00\u4E2A");
  const resets = dates.map((expiresOn) => {
    const expiresAt = expiryTime(expiresOn, timeZone2);
    if (expiresAt <= now.getTime()) throw new Error(`\u5907\u7528 reset ${expiresOn} \u5DF2\u8FC7\u671F`);
    return {
      expiresOn,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInHours: (expiresAt - now.getTime()) / HOUR9
    };
  }).sort((a, b) => a.expiresInHours - b.expiresInHours);
  const at = (offset) => {
    const date = new Date(now.getTime() + offset * HOUR9);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  };
  const elapsedDays = (168 - horizon) / 24;
  const averagePercentPerDay = elapsedDays > EPS4 && remaining < 100 ? (100 - remaining) / elapsedDays : null;
  const common = {
    now: now.toISOString(),
    timeZone: timeZone2,
    remainingPercent: remaining,
    elapsedDays,
    usedPercent: 100 - remaining,
    averagePercentPerDay,
    normalResetInHours: horizon,
    normalResetAt: at(horizon),
    resets,
    credits: { balance: credits, creditsPerPercent, included: creditsPerPercent !== null },
    predictionEnabled: prediction !== null
  };
  if (averagePercentPerDay === null) return {
    ...common,
    available: false,
    options: [],
    reason: "\u672C\u8F6E\u8FD8\u6CA1\u6709\u53EF\u8BA1\u7B97\u7684\u5E73\u5747\u6D88\u8017\uFF0C\u6682\u65F6\u65E0\u6CD5\u4F30\u8BA1\u7528\u5B8C\u65E5\u671F\u3002"
  };
  const options = intensityChoices.map((choice) => {
    const dailyRate = averagePercentPerDay * choice.multiplier;
    const hourlyRate = dailyRate / 24;
    const initialDepletionHours = remaining / hourlyRate;
    const events = [], segments = [], used = /* @__PURE__ */ new Set();
    let time = 0, quota = remaining, creditBalance = credits, stopAtHours = null;
    const advance = (end, source = "quota") => {
      const startQuota = quota;
      const startCredits = creditBalance;
      const consumed = Math.max(0, end - time) * hourlyRate;
      if (source === "quota") quota = Math.max(0, quota - consumed);
      else creditBalance = Math.max(0, creditBalance - consumed * creditsPerPercent);
      segments.push({ startHours: time, endHours: end, startQuota, startCredits, source });
      time = end;
    };
    while (time < horizon - EPS4) {
      const depletion = time + quota / hourlyRate;
      if (depletion >= horizon - EPS4) {
        advance(horizon);
        break;
      }
      const reset = resets.find((item) => !used.has(item) && item.expiresInHours > time + EPS4);
      if (reset) {
        const redeemAt = Math.min(depletion, Math.max(time, reset.expiresInHours - 1));
        advance(redeemAt);
        events.push({
          kind: "backup",
          atHours: time,
          at: at(time),
          expiresOn: reset.expiresOn,
          early: redeemAt + EPS4 < depletion,
          overwrittenPercent: quota
        });
        quota = 100;
        used.add(reset);
        continue;
      }
      advance(depletion);
      if (creditsPerPercent !== null && creditBalance > EPS4) {
        events.push({ kind: "credits", atHours: time, at: at(time) });
        const paidUntil = Math.min(horizon, time + creditBalance / (hourlyRate * creditsPerPercent));
        advance(paidUntil, "credits");
      }
      if (time < horizon - EPS4) stopAtHours = time;
      break;
    }
    const unusedExpiring = resets.filter((reset) => !used.has(reset) && reset.expiresInHours <= horizon);
    for (const reset of unusedExpiring) events.push({
      kind: "expiry",
      atHours: reset.expiresInHours,
      at: reset.expiresAt,
      expiresOn: reset.expiresOn
    });
    events.sort((a, b) => a.atHours - b.atHours);
    const days = [];
    for (let start = 0; start < horizon - EPS4; start += 24) {
      const end = Math.min(start + 24, horizon);
      const segment = segments.filter((item) => item.startHours <= end + EPS4).at(-1);
      const normalRefresh = end >= horizon - EPS4;
      const stopped = stopAtHours !== null && end >= stopAtHours - EPS4;
      const balance = normalRefresh ? 100 : stopped || segment?.source === "credits" ? 0 : Math.max(0, (segment?.startQuota ?? remaining) - (end - (segment?.startHours ?? 0)) * hourlyRate);
      days.push({
        day: days.length + 1,
        startHours: start,
        endHours: end,
        at: at(end),
        remainingPercent: balance,
        stopped,
        normalRefresh
      });
    }
    const nextSupply = events.find((event) => event.kind === "backup" || event.kind === "credits");
    const decisionHours = nextSupply?.atHours ?? stopAtHours ?? horizon;
    return {
      ...choice,
      dailyPercent: dailyRate,
      initialDepletionHours,
      initialDepletionAt: at(initialDepletionHours),
      canReachNormalRefresh: stopAtHours === null,
      stopAtHours,
      stopAt: stopAtHours === null ? null : at(stopAtHours),
      pauseHours: stopAtHours === null ? 0 : horizon - stopAtHours,
      backupUsed: used.size,
      expiredUnused: unusedExpiring,
      creditsSpent: credits - creditBalance,
      events,
      days,
      forecast: prediction ? {
        byHours: decisionHours,
        byAt: at(decisionHours),
        probability: resetProbabilityByHours(prediction, decisionHours),
        onReset: "replan-from-full-balance"
      } : null
    };
  });
  return { ...common, available: true, options };
}

// src/phase-reset-opportunities.js
var HOUR10 = 36e5;
var EPS5 = 1e-7;
function phaseResetOpportunities(result, prediction) {
  if (!result.available || !prediction || !result.phasePlans) return result;
  const points = result.milestones.points, events = points.flatMap((point) => point.events);
  const extra = events.filter((event) => event.kind === "assumed-extra-reset");
  const banks = events.filter((event) => event.kind === "backup");
  const at = (hours) => new Date(Math.round(Date.parse(result.now) + hours * HOUR10)).toISOString();
  const phasePlans = result.phasePlans.map((phase) => {
    const start = phase.startHours;
    const state2 = points.find((point) => Math.abs(point.hours - start) < EPS5)?.stateAfter;
    if ((state2?.quota ?? phase.quotaBefore ?? 0) <= EPS5) return phase;
    const supply = points.find((point) => point.hours > start + EPS5 && point.reasons.some((reason) => ["backup", "normal-refresh", "assumed-extra-reset"].includes(reason)));
    const boundaries = [
      ...result.usageStrategy === "keep-available" ? [{ hours: phase.endHours, kind: "availability-review" }] : [],
      ...supply ? [{ hours: supply.hours, kind: supply.reasons.includes("backup") ? "backup" : supply.reasons.includes("assumed-extra-reset") ? "assumed-extra-reset" : "normal-refresh" }] : [],
      ...result.normalResetInHours > start + EPS5 ? [{ hours: result.normalResetInHours, kind: "normal-refresh" }] : [],
      ...result.resets.filter((reset, index) => reset.expiresInHours > start + EPS5 && !banks.some((event) => event.resetIndex === index && event.atHours <= start + EPS5)).map((reset) => ({ hours: reset.expiresInHours - 1 > start + EPS5 ? reset.expiresInHours - 1 : reset.expiresInHours, kind: "backup-expiry" }))
    ].filter((boundary2) => boundary2.hours > start + EPS5).sort((a, b) => a.hours - b.hours);
    const boundary = boundaries[0] ?? { hours: phase.endHours, kind: "phase-end" };
    if (boundary.hours <= start + EPS5) return phase;
    const previous = extra.filter((event) => event.atHours <= start + EPS5).at(-1);
    const cdf = (hours) => previous ? renewedResetProbabilityByHours(prediction, result.now, previous.at, hours) : resetProbabilityByHours(prediction, hours);
    const before = cdf(start), after = cdf(boundary.hours);
    if (!Number.isFinite(before) || !Number.isFinite(after) || before >= 1 - EPS5) return phase;
    const probability2 = Math.max(0, Math.min(1, (after - before) / (1 - before)));
    return { ...phase, nextResetOpportunity: {
      startAt: at(start),
      until: at(boundary.hours),
      startHours: start,
      untilHours: boundary.hours,
      boundaryKind: boundary.kind,
      probability: probability2,
      previousExtraResetAt: previous?.at ?? null,
      nextExtraResetSequence: previous ? (previous.sequence ?? 1) + 1 : 1,
      conditional: true,
      basis: "no-additional-public-reset-before-phase-start",
      renewalBasis: previous ? "selected-extra-reset" : "current-public-reset-forecast"
    } };
  });
  const backupChoices = result.backupChoices?.map((choice) => {
    if (!choice.used || choice.required || choice.reason !== "quota-exhausted") return choice;
    const previous = extra.filter((event) => event.atHours <= choice.atHours + EPS5).at(-1);
    const cdf = previous ? renewedResetProbabilityByHours(prediction, result.now, previous.at, choice.atHours) : resetProbabilityByHours(prediction, choice.atHours);
    return { ...choice, usageCondition: {
      kind: "no-further-reset-and-quota-exhausted",
      since: previous?.at ?? result.now,
      until: choice.at,
      probability: Number.isFinite(cdf) ? Math.max(0, Math.min(1, 1 - cdf)) : null,
      previousExtraResetAt: previous?.at ?? null,
      nextExtraResetSequence: previous ? (previous.sequence ?? 1) + 1 : 1
    } };
  });
  return { ...result, phasePlans, backupChoices, forecastScenario: result.forecastScenario?.selected ? { ...result.forecastScenario, phases: phasePlans } : result.forecastScenario };
}

// src/usage-pace-steps.js
var paceChoices = [0, 10, 20, 30, 50, 100].map((increasePercent) => ({
  multiplier: 1 + increasePercent / 100,
  label: increasePercent ? `\u589E\u52A0 ${increasePercent}%` : "\u4FDD\u6301\u5F53\u524D\u7528\u91CF"
}));

// src/strategy-milestones.js
var HOUR11 = 36e5;
var EPS6 = 1e-6;
function policyMilestones(result, cumulativeProbability) {
  const levels = result.decisionTree.levels;
  const selected = levels.map((level) => level.actions.find((action) => action.id === level.selectedActionId));
  const steps = selected.map((action) => action.outcome);
  const endHours = steps.at(-1).endHours;
  const endKind = result.planningEndKind ?? (levels.at(-1).resetProbability >= 1 - EPS6 ? "extra-reset" : "normal-refresh");
  const at = (hour) => new Date(Math.round(Date.parse(result.now) + hour * HOUR11)).toISOString();
  const key = (hour) => Number(hour.toFixed(7));
  const entries = /* @__PURE__ */ new Map();
  const point = (hour) => {
    const value = key(hour);
    if (!entries.has(value)) entries.set(value, { hours: value, at: at(value), reasons: [], events: [] });
    return entries.get(value);
  };
  point(0).reasons.push("current");
  point(endHours).reasons.push(endKind);
  const usage = steps.flatMap((step) => step.usageSegments).filter((segment) => segment.endHours - segment.startHours > EPS6);
  let previous = null;
  for (const segment of usage) {
    const daily = segment.multiplier * result.averagePercentPerDay;
    if (previous && Math.abs(previous.daily - daily) > 1e-5)
      point(segment.startHours).reasons.push("pace-change");
    if (segment.kind === "quota" && segment.remainingBefore > EPS6 && segment.remainingAfter <= EPS6 && usage.find((next) => Math.abs(next.startHours - segment.endHours) < EPS6)?.kind !== "rest" && segment.endHours < endHours - EPS6) {
      point(segment.endHours).reasons.push("depletion");
    }
    previous = { daily };
  }
  const bankEvents = steps.flatMap((step) => step.events).filter((event) => event.kind === "backup");
  const supplyEvents = steps.flatMap((step) => step.events).filter((event) => ["backup", "normal-refresh", "assumed-extra-reset"].includes(event.kind));
  for (const event of supplyEvents) {
    const entry = point(event.atHours);
    entry.reasons.push(event.kind);
    entry.events.push(event);
  }
  for (const step of steps) for (const index of step.resetIndicesExpired) {
    const reset = result.resets[index];
    const entry = point(reset.expiresInHours);
    entry.reasons.push("expiry");
    entry.events.push({
      kind: "expiry",
      resetIndex: index,
      atHours: reset.expiresInHours,
      at: reset.expiresAt,
      expiresOn: reset.expiresOn
    });
  }
  if (result.credits.bridge) {
    const bridge = result.credits.bridge;
    point(bridge.atHours).events.push({ ...bridge, kind: "credits-advisory" });
  }
  const stateAt = (hour, beforeEvents) => {
    let quota;
    const supply = supplyEvents.find((event) => Math.abs(event.atHours - hour) < EPS6);
    const active = usage.find((segment) => segment.startHours <= hour + EPS6 && segment.endHours > hour + EPS6);
    if (hour < EPS6 && beforeEvents) quota = result.remainingPercent;
    else if (supply) quota = beforeEvents ? supply.overwrittenPercent : 100;
    else if (active?.kind === "quota") quota = Math.max(0, active.remainingBefore - (hour - active.startHours) * active.multiplier * result.averagePercentPerDay / 24);
    else quota = active ? active.remainingBefore : steps.at(-1).remainingAfter;
    if (!beforeEvents && Math.abs(hour - endHours) < EPS6 && endKind !== "planning-horizon") quota = 100;
    const used = new Set(bankEvents.filter((event) => beforeEvents ? event.atHours < hour - EPS6 : event.atHours <= hour + EPS6).map((event) => event.resetIndex));
    const resets = result.resets.filter((reset, index) => !used.has(index) && (beforeEvents ? reset.expiresInHours >= hour - EPS6 : reset.expiresInHours > hour + EPS6)).length;
    return { quota: Number(quota.toFixed(7)), resets, credits: result.credits.balance };
  };
  const points = [...entries.values()].filter((entry) => entry.hours <= endHours + EPS6).sort((a, b) => a.hours - b.hours).map((entry) => ({
    ...entry,
    reasons: [...new Set(entry.reasons)],
    stateBefore: stateAt(entry.hours, true),
    stateAfter: stateAt(entry.hours, false),
    cumulativeResetProbability: result.predictionEnabled ? cumulativeProbability(entry.hours) : null
  }));
  const segments = points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const active = usage.find((segment) => segment.startHours <= start.hours + EPS6 && segment.endHours > start.hours + EPS6);
    const source = levels.findIndex((level, rawIndex) => steps[rawIndex].startHours <= start.hours + EPS6 && steps[rawIndex].endHours > start.hours + EPS6);
    const multiplier = active?.multiplier ?? 0;
    const usedPercent = usage.filter((segment) => segment.kind === "quota").reduce((sum, segment) => sum + Math.max(0, Math.min(end.hours, segment.endHours) - Math.max(start.hours, segment.startHours)) * segment.multiplier * result.averagePercentPerDay / 24, 0);
    const before = start.cumulativeResetProbability ?? 0;
    const after = end.cumulativeResetProbability ?? 0;
    return {
      index,
      sourceLevelIndex: source,
      canChoose: source >= 0 && Math.abs(steps[source].startHours - start.hours) < EPS6,
      startHours: start.hours,
      endHours: end.hours,
      startAt: start.at,
      endAt: end.at,
      multiplier,
      dailyPercent: multiplier * result.averagePercentPerDay,
      usedPercent,
      state: start.stateBefore,
      endState: end.stateBefore,
      startReasons: start.reasons,
      endReasons: end.reasons,
      events: start.events,
      cumulativeResetProbability: end.cumulativeResetProbability,
      conditionalResetProbability: Math.max(0, Math.min(1, (after - before) / Math.max(EPS6, 1 - before)))
    };
  });
  return {
    segments,
    points,
    endKind,
    probabilityBasis: "cumulative-from-plan-start",
    rawDecisionPeriods: levels.length
  };
}

// src/recommended-usage-path.js
var EPS7 = 1e-7;
var HOUR12 = 36e5;
var DEFAULT_RECOMMENDATION_MODE = "forecast-preview";
function recommendedUsagePath(base, prediction, {
  targetDailyPercent,
  sampleCount = 64,
  usageStrategy = "balanced",
  dailyCapacityPercent = null,
  assumedResetCount = "auto",
  recommendationMode = DEFAULT_RECOMMENDATION_MODE,
  availabilityMode = "optimistic",
  alertsEnabled = false
} = {}) {
  const availableGoal = usageStrategy === "keep-available";
  const cautious = availableGoal && availabilityMode === "cautious";
  if (cautious) recommendationMode = "feedback";
  const originalNormal = base.originalNormalResetAt ?? base.normalResetAt;
  const initial = {
    ...base,
    normalResetAt: originalNormal,
    normalResetInHours: (Date.parse(originalNormal) - Date.parse(base.now)) / HOUR12
  };
  const recommendation = searchResetPolicies({
    base: initial,
    prediction,
    targetDailyPercent,
    sampleCount,
    usageStrategy,
    dailyCapacityPercent,
    availabilityMode,
    alertsEnabled,
    heldResetIndices: base.heldResetIndices ?? [],
    requiredResetIndices: base.requiredResetIndices ?? [],
    includeBridgeAlternative: recommendationMode === "feedback"
  });
  const alternative = cautious ? null : forecastFirstPlan({
    base: initial,
    prediction,
    search: recommendation,
    assumedResetCount,
    heldResetIndices: base.heldResetIndices ?? [],
    requiredResetIndices: base.requiredResetIndices ?? []
  });
  const primary = recommendationMode === "feedback" ? null : alternative;
  recommendation.robustFirstAction = recommendation.firstAction;
  recommendation.robustFallback = recommendation.fallback;
  recommendation.primary = primary;
  recommendation.mode = recommendationMode;
  if (recommendationMode === "feedback") recommendation.forecastAlternative = alternative;
  if (primary) {
    recommendation.firstAction = primary.firstAction;
    recommendation.fallback = primary.fallback;
  }
  const trace = primary?.trace ?? recommendation.fallback, at = (hour) => new Date(Date.parse(base.now) + hour * HOUR12).toISOString();
  const banks = trace.events.filter((event) => event.kind === "backup");
  const supplies = trace.events.filter((event) => event.kind !== "expiry");
  const levels = trace.segments.map((segment, index) => {
    const events = supplies.filter((event) => Math.abs(event.atHours - segment.endHours) < EPS7 || index === 0 && event.atHours < EPS7);
    const expired = trace.events.filter((event) => event.kind === "expiry" && Math.abs(event.atHours - segment.endHours) < EPS7).map((event) => event.resetIndex);
    const outcome = {
      startHours: segment.startHours,
      endHours: segment.endHours,
      startAt: segment.startAt,
      endAt: segment.endAt,
      multiplier: segment.multiplier,
      remainingBefore: segment.remainingBefore,
      remainingAfter: segment.remainingAfter,
      resetIndicesUsed: events.filter((event) => event.kind === "backup").map((event) => event.resetIndex),
      resetIndicesExpired: expired,
      events,
      creditsRemaining: base.credits.balance,
      creditsSpent: 0,
      resetsRemaining: base.resets.filter((reset, i) => reset.expiresInHours > segment.endHours + EPS7 && !banks.some((event) => event.resetIndex === i && event.atHours <= segment.endHours + EPS7)).length,
      pauseHours: segment.kind === "pause" ? segment.endHours - segment.startHours : 0,
      usedDays: (segment.remainingBefore - segment.remainingAfter) / base.averagePercentPerDay,
      usageSegments: [segment],
      pauses: segment.kind === "pause" ? [segment] : []
    };
    const action = {
      id: "recommended-policy",
      actionId: `policy:${index}`,
      multiplier: segment.multiplier,
      bankMode: events.some((event) => event.kind === "backup") ? "when-needed" : "hold",
      useCredits: false
    };
    return {
      index,
      startAt: segment.startAt,
      endAt: segment.endAt,
      state: {
        quota: segment.remainingBefore,
        resets: outcome.resetsRemaining,
        credits: base.credits.balance
      },
      selectedActionId: action.actionId,
      actions: [{
        id: action.actionId,
        action,
        outcome,
        recommended: true,
        fallback: { firstPauseAt: outcome.pauses[0]?.startAt ?? null, expiredResets: expired.length }
      }],
      resetProbability: 0,
      onReset: { remainingPercent: 100, action: "replan" }
    };
  });
  const result = {
    ...base,
    recommendation,
    fixedPace: false,
    normalResetInHours: trace.normalHour,
    normalResetAt: at(trace.normalHour),
    normalResetSource: supplies.some((event) => event.kind !== "normal-refresh") ? "estimated-restarted-week" : "entered-account-time",
    planningEndKind: trace.endKind,
    planningHorizonHours: recommendation.horizonHours,
    search: {
      policies: recommendation.candidates.length,
      scenarios: recommendation.scenarioCount,
      evaluations: recommendation.candidates.length * recommendation.scenarioCount
    },
    usageStrategy,
    dailyCapacityPercent,
    strategy: {
      ...base.strategy,
      usageStrategy,
      dailyCapacityPercent,
      method: recommendation.method,
      optimality: primary ? "forecast-priority-then-best-enumerated-bank-plan" : recommendation.optimality,
      fixedUserPace: false,
      priority: primary ? "predicted-free-refills-before-banked-resets" : "expected-work-continuity-and-future-resources",
      conditional: !!primary,
      assumedResetTimes: primary?.assumedResetTimes ?? [],
      plottedBranch: primary ? "predicted-extra-resets-first" : "no-further-public-reset",
      objective: recommendation.objective
    },
    decisionTree: { levels, selectedActionIds: levels.map((level) => level.selectedActionId) },
    options: [{
      id: "recommended-policy",
      conditional: !!primary,
      expected: primary ? null : recommendation.selected.expected,
      contingency: { steps: levels.map((level) => level.actions[0].outcome) }
    }],
    selectedOptionId: "recommended-policy"
  };
  result.milestones = policyMilestones(result, (hour) => prediction ? resetProbabilityByHours(prediction, hour) ?? 0 : 0);
  result.phasePlans = [];
  for (const segment of trace.segments) {
    const previous = result.phasePlans.at(-1);
    if (previous && Math.abs(previous.dailyPercent - segment.dailyPercent) < EPS7 && previous.plannedRest === (segment.kind === "rest") && !supplies.some((event) => Math.abs(event.atHours - segment.startHours) < EPS7)) {
      previous.endHours = segment.endHours;
      previous.endAt = segment.endAt;
      continue;
    }
    result.phasePlans.push({
      phaseIndex: result.phasePlans.length,
      startHours: segment.startHours,
      endHours: segment.endHours,
      startAt: segment.startAt,
      endAt: segment.endAt,
      multiplier: segment.multiplier,
      dailyPercent: segment.dailyPercent,
      baselineDailyPercent: targetDailyPercent,
      reason: segment.reason ?? (primary ? "forecast-first-allocation" : "scenario-optimized"),
      plannedRest: segment.kind === "rest",
      stageReason: segment.reason === "availability-missed-forecast" ? "if-no-extra-reset-at-review" : "recommended-policy",
      fixed: Math.abs(segment.dailyPercent - targetDailyPercent) < EPS7,
      constrained: false,
      quotaBefore: segment.remainingBefore,
      resourceCycle: supplies.filter((event) => event.atHours <= segment.startHours + EPS7).length
    });
  }
  result.backupChoices = backupChoicePositions(result, banks, at);
  return result;
}
function backupChoicePositions(result, banks, at) {
  const EPS9 = 1e-6;
  const points = result.milestones.points, end = points.at(-1).hours;
  const quotaAt = (hour) => {
    const segment = result.milestones.segments.find((segment2) => segment2.startHours <= hour + EPS9 && segment2.endHours > hour + EPS9);
    if (!segment) return points.at(-1).stateBefore.quota;
    const start = points.find((point) => Math.abs(point.hours - segment.startHours) < EPS9).stateAfter.quota;
    return Math.max(0, start - (hour - segment.startHours) * segment.dailyPercent / 24);
  };
  return result.resets.map((reset, index) => {
    const used = banks.find((event) => event.resetIndex === index);
    const depleted = points.find((point) => point.reasons.includes("depletion") && point.hours < end - EPS9 && point.hours < reset.expiresInHours - EPS9 && point.stateAfter.quota <= EPS9);
    const deadline = Math.max(0, reset.expiresInHours - 1);
    const hours = used?.atHours ?? (depleted ? Math.min(depleted.hours, deadline) : deadline < end - EPS9 ? deadline : null);
    const actionable = hours !== null;
    return {
      index,
      ...reset,
      used: !!used,
      held: (result.heldResetIndices ?? []).includes(index),
      required: (result.requiredResetIndices ?? []).includes(index),
      actionable,
      atHours: hours,
      at: actionable ? at(hours) : null,
      quotaAtDecision: actionable ? used?.overwrittenPercent ?? quotaAt(hours) : null,
      reason: used?.reason ?? (!actionable ? "not-needed-before-refresh" : deadline <= hours + EPS9 ? "expiry-deadline" : "quota-exhausted"),
      expiresBeforeDepletion: !used && actionable && deadline <= hours + EPS9 && quotaAt(hours) > EPS9
    };
  });
}

// src/account-resource-state.js
function accountResourceState(snapshot, { now, timeZone: timeZone2, prediction = null }) {
  const stamp = now.getTime(), readAt = Date.parse(snapshot?.readAt), hour = 36e5;
  if (!Number.isFinite(stamp) || !Number.isFinite(readAt) || stamp - readAt > 15 * 60 * 1e3 || readAt - stamp > 1e3)
    throw new Error("\u7528\u91CF\u5FEB\u7167\u5DF2\u8FC7\u671F\u6216\u65F6\u95F4\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6 Codex \u7528\u91CF");
  new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2 }).format(now);
  if (snapshot.ordinaryUsageAllowed === false) throw new Error("Codex \u5F53\u524D\u4E0D\u5141\u8BB8\u666E\u901A\u989D\u5EA6\u4F7F\u7528");
  const weekly = snapshot.weekly, remaining = weekly?.remainingPercent;
  const resetAt = Date.parse(weekly?.resetAt), horizon = (resetAt - stamp) / hour;
  if (weekly?.periodHours !== 168 || !Number.isFinite(remaining) || remaining < 0 || remaining > 100 || horizon <= 0 || horizon > 168)
    throw new Error("Codex \u672A\u8FD4\u56DE\u6709\u6548\u7684\u4E03\u5929\u989D\u5EA6\u7A97\u53E3\uFF0C\u8BF7\u68C0\u67E5\u8D26\u6237\u6216\u4F7F\u7528\u624B\u52A8\u8F93\u5165");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  const banks = snapshot.bankedResets ?? [];
  if (!Array.isArray(banks)) throw new Error("\u5907\u7528 reset \u6570\u636E\u65E0\u6548");
  const known = banks.filter((item) => item?.expiresAt !== null).map((item) => {
    const expiresAt = Date.parse(item.expiresAt);
    if (!Number.isFinite(expiresAt)) throw new Error("\u5907\u7528 reset \u5230\u671F\u65F6\u95F4\u65E0\u6548");
    return {
      expiresOn: date.format(new Date(expiresAt)),
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInHours: (expiresAt - stamp) / hour
    };
  }).filter((item) => item.expiresInHours > 0).sort((a, b) => a.expiresInHours - b.expiresInHours);
  const warnings = [];
  if (snapshot.bankedResetCount == null || !snapshot.bankedResetDetailsComplete || banks.some((item) => item.expiresAt === null))
    warnings.push("\u5907\u7528 reset \u6570\u91CF\u6216\u5230\u671F\u8BE6\u60C5\u4E0D\u5B8C\u6574\uFF1B\u53EA\u7EB3\u5165\u5DF2\u786E\u8BA4\u5230\u671F\u65F6\u95F4\u7684\u5E93\u5B58");
  if (known.length > 8) warnings.push("\u53EA\u6A21\u62DF\u6700\u65E9\u5230\u671F\u7684\u516B\u4E2A\u5907\u7528 reset");
  const elapsedDays = (168 - horizon) / 24, used = 100 - remaining;
  const average = elapsedDays >= 1 / 24 && used > 0 ? used / elapsedDays : null;
  return {
    now: now.toISOString(),
    timeZone: timeZone2,
    remainingPercent: remaining,
    elapsedDays,
    usedPercent: used,
    averagePercentPerDay: average,
    normalResetInHours: horizon,
    normalResetAt: new Date(resetAt).toISOString(),
    resets: known.slice(0, 8),
    credits: { balance: 0, creditsPerPercent: null, included: false },
    predictionEnabled: prediction !== null,
    available: average !== null,
    ...!average ? { reason: "\u672C\u8F6E\u8FD8\u6CA1\u6709\u53EF\u8BA1\u7B97\u7684\u5E73\u5747\u6D88\u8017\uFF0C\u6682\u65F6\u65E0\u6CD5\u4F30\u8BA1\u7528\u5B8C\u65E5\u671F\u3002" } : {},
    resourceSource: "codex-app-server",
    resourceWarnings: warnings,
    paceAssumption: "\u4ECE\u672C\u8F6E\u7A97\u53E3\u5DF2\u6D88\u8017\u989D\u5EA6\u63A8\u7B97\u5E73\u5747\u7528\u91CF\uFF1B\u4E0D\u662F\u8FD1\u671F\u5B9E\u6D4B\u901F\u5EA6"
  };
}

// src/usage-path-planner.js
var HOUR13 = 36e5;
var EPS8 = 1e-7;
var REMOVED_OPTIONS = [
  "adaptivePace",
  "optimizePolicy",
  "flexibleSchedule",
  "fixedPace",
  "phasePaceOverrides",
  "decisionPath",
  "assumeMostLikelyReset",
  "assumeSecondReset"
];
function planUsagePath({
  input: input2,
  now = /* @__PURE__ */ new Date(),
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  prediction = null,
  averagePercentPerDay = null,
  paceMultiplier = 1,
  heldResetIndices = [],
  requiredResetIndices = [],
  usageStrategy = "balanced",
  dailyCapacityPercent = null,
  usageSnapshot = null,
  recommendationMode = DEFAULT_RECOMMENDATION_MODE,
  availabilityMode = "optimistic",
  alertsEnabled = false,
  assumedResetCount = "auto",
  ...other
} = {}) {
  const removed = REMOVED_OPTIONS.filter((key) => key in other);
  if (removed.length) throw new Error(`\u53EA\u6709\u4E00\u79CD\u89C4\u5212\u7B97\u6CD5\uFF1B\u5DF2\u79FB\u9664\u53C2\u6570\uFF1A${removed.join(", ")}`);
  if (!["forecast-preview", "feedback"].includes(recommendationMode)) throw new Error("Unknown recommendation mode");
  if (!validUsageStrategy(usageStrategy)) throw new Error("Unknown usage strategy");
  if (!["auto", 0, 1, 2].includes(assumedResetCount)) throw new Error("\u5047\u8BBE\u91CD\u7F6E\u6B21\u6570\u9700\u4E3A\u81EA\u52A8\u6216 0\u20132");
  if (!paceChoices.some((choice) => choice.multiplier === paceMultiplier))
    throw new Error("\u4F7F\u7528\u5F3A\u5EA6\u8BF7\u9009\u62E9\u4FDD\u6301\u5F53\u524D\uFF0C\u6216\u589E\u52A010%\u300120%\u300130%\u300150%\u3001100%");
  if (input2?.allowCredits !== void 0 && typeof input2.allowCredits !== "boolean")
    throw new Error("\u662F\u5426\u613F\u610F\u4F7F\u7528 Credits \u9700\u4E3A\u662F\u6216\u5426");
  const { options, ...base } = usageSnapshot ? accountResourceState(usageSnapshot, { now, timeZone: timeZone2, prediction }) : planIntensityUsage({ input: input2, now, timeZone: timeZone2, prediction });
  if (averagePercentPerDay !== null) {
    if (!Number.isFinite(averagePercentPerDay) || averagePercentPerDay <= 0)
      throw new Error("\u5DF2\u89C2\u5BDF\u7684\u5E73\u5747\u6D88\u8017\u9700\u5927\u4E8E\u96F6");
    base.averagePercentPerDay = averagePercentPerDay;
    base.available = true;
    base.paceSource = "provided-observation";
    delete base.reason;
  } else base.paceSource = "normal-window-average";
  base.credits = {
    balance: input2?.credits ?? 0,
    allowed: input2?.allowCredits === true,
    unit: "credits",
    included: false,
    quantified: false,
    consumption: "user-estimated",
    bridge: null
  };
  base.creditsCostSource = "not-estimated";
  if (!base.available) return { ...base, options: [], strategy: null };
  const rate = base.averagePercentPerDay;
  const resets = base.resets;
  if (!Array.isArray(heldResetIndices) || heldResetIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= resets.length)) throw new Error("\u4FDD\u7559\u7684\u5907\u7528 reset \u7D22\u5F15\u65E0\u6548");
  if (!Array.isArray(requiredResetIndices) || requiredResetIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= resets.length || heldResetIndices.includes(index))) throw new Error("\u5FC5\u987B\u4F7F\u7528\u7684\u5907\u7528\u7D22\u5F15\u65E0\u6548\u6216\u540C\u65F6\u9009\u62E9\u4E86\u4FDD\u7559");
  const at = (hour) => new Date(Math.round(now.getTime() + hour * HOUR13)).toISOString();
  const cumulative = (hour) => prediction ? resetProbabilityByHours(prediction, hour) ?? 0 : 0;
  const calendar2 = prediction ? forecastCalendar(base, at, cumulative, 336) : [];
  const targetDailyPercent = rate * paceMultiplier;
  const result = recommendedUsagePath(
    {
      ...base,
      adaptivePace: true,
      flexibleSchedule: true,
      paceMultiplier,
      paceChoices,
      heldResetIndices,
      requiredResetIndices,
      originalNormalResetAt: base.normalResetAt,
      forecastCalendar: calendar2,
      startingPoint: { intent: "steady", multiplier: targetDailyPercent / rate, dailyPercent: targetDailyPercent },
      resetWindowAssumption: "restart-seven-days-on-every-replenishment; confirmed"
    },
    prediction,
    { targetDailyPercent, usageStrategy, dailyCapacityPercent, recommendationMode, availabilityMode, alertsEnabled, assumedResetCount }
  );
  result.resetForecast = strategyResetForecast(result, prediction);
  const primary = result.recommendation?.primary;
  if (!primary) {
    result.forecastScenario = forecastAssumptionCards(result, prediction);
    return phaseResetOpportunities(result, prediction);
  }
  const assumptions = primary.trace.events.filter((event) => event.kind === "assumed-extra-reset");
  const following = result.resetForecast.followingReset;
  const conservative = conservativeResetTimes(result, prediction);
  const firstAt = assumptions[0]?.at ?? conservative[0] ?? prediction.resetTimeMode.pointAt;
  result.forecastScenario = {
    available: true,
    conditional: true,
    selected: assumptions.length > 0,
    secondSelected: assumptions.length > 1,
    at: firstAt,
    hours: (Date.parse(firstAt) - Date.parse(result.now)) / HOUR13,
    assumptionRule: primary.assumption,
    currentDailyPercent: result.startingPoint.dailyPercent,
    recommendedDailyPercent: primary.firstAction.dailyPercent,
    phases: result.phasePlans,
    assumptions: assumptions.map((event) => ({ ...event, selected: true, hours: event.atHours })),
    following: {
      ...following,
      available: !!following,
      selected: assumptions.length > 1,
      hours: (Date.parse(assumptions[1]?.at ?? conservative[1] ?? following?.pointAt) - Date.parse(result.now)) / HOUR13
    },
    plannedResetIndices: primary.trace.events.filter((event) => event.kind === "backup").map((event) => event.resetIndex),
    onObservedReset: "replan-from-actual-account"
  };
  return phaseResetOpportunities(result, prediction);
}
function forecastCalendar(base, at, cumulative, horizon = base.normalResetInHours) {
  const points = [];
  const dayFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: base.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const clockFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: base.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const [year, month, day] = dayFormat.format(new Date(base.now)).split("-").map(Number);
  for (let offset = 1; offset <= 15; offset++) {
    const target = Date.UTC(year, month - 1, day + offset);
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const p = Object.fromEntries(clockFormat.formatToParts(instant).map((part) => [part.type, part.value]));
      const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const corrected = target - (local - instant);
      if (corrected === instant) break;
      instant = corrected;
    }
    const hour = (instant - Date.parse(base.now)) / HOUR13;
    if (hour >= horizon - EPS8) break;
    points.push(hour);
  }
  points.push(base.normalResetInHours, horizon);
  return [...new Set(points)].sort((a, b) => a - b).map((hours) => ({ at: at(hours), hours, probability: cumulative(hours) }));
}

// src/strategy-time-range.js
var HOUR14 = 36e5;
var WEEK2 = 168;
var SLOWEST_COVERED_PACE = 0.5;
function strategyTimeRange(result, { prediction = null, forecastEndHours = 0 } = {}) {
  const origin = Date.parse(result.now);
  const hours = (stamp) => (Date.parse(stamp) - origin) / HOUR14;
  const original = hours(result.originalNormalResetAt ?? result.normalResetAt);
  const normal = Number.isFinite(original) ? original : result.normalResetInHours;
  let states = [{ time: 0, quota: result.remainingPercent, normal }];
  const first = prediction?.resetTimeMode ?? prediction?.resetTimeEstimate ?? result.resetForecast?.timeMode ?? result.resetForecast?.timeEstimate;
  const second = prediction?.followingResetEstimate ?? result.resetForecast?.followingReset;
  const firstHours = hours(first?.pointAt), secondHours = hours(second?.pointAt);
  if (firstHours > 0 && firstHours <= 336) {
    states.push({ time: firstHours, quota: 100, normal: firstHours + WEEK2 });
    if (secondHours > firstHours) states.push({ time: secondHours, quota: 100, normal: secondHours + WEEK2 });
  }
  if (prediction) {
    const assumed = confidentResetTimes({ prediction, now: result.now, normalHours: normal, count: 2 }).times;
    for (const time of assumed) if (time > 0 && time <= 336) states.push({ time, quota: 100, normal: time + WEEK2 });
  }
  for (const { expires, index } of (result.resets ?? []).map((reset, index2) => ({ expires: reset.expiresInHours, index: index2 })).filter((item) => Number.isFinite(item.expires) && item.expires > 0).sort((a, b) => a.expires - b.expires)) {
    const extended = [...states];
    for (const state2 of states) {
      if (expires <= state2.time) continue;
      const multipliers = paceChoices.map((choice) => choice.multiplier);
      if (result.recommendation) multipliers.push(result.recommendation.targetDailyPercent / result.averagePercentPerDay * SLOWEST_COVERED_PACE);
      const waits = result.recommendation ? [...new Set(result.recommendation.candidates.map((item) => item.policy.waitHours === "forecast" ? FORECAST_BANK_WAIT_CAP_HOURS : item.policy.waitHours))] : [0];
      const depletions = state2.quota <= 0 ? [state2.time] : multipliers.flatMap((multiplier) => waits.map((wait) => state2.time + state2.quota * 24 / (result.averagePercentPerDay * multiplier) + wait)).filter((hour) => Number.isFinite(hour) && hour < state2.normal - 1e-6 && hour < expires);
      const deadlines = expires < state2.normal - 1e-6 ? [expires] : [];
      const forced = !depletions.length && !deadlines.length && (result.requiredResetIndices ?? []).includes(index) ? [Math.max(state2.time, Math.min(expires - 1, state2.normal - 1))] : [];
      const lastUse = Math.max(-Infinity, ...depletions, ...deadlines, ...forced);
      if (Number.isFinite(lastUse)) extended.push({ time: lastUse, quota: 100, normal: lastUse + WEEK2 });
    }
    states = [...new Map(extended.map((state2) => [`${state2.time}:${state2.quota}`, state2])).values()];
  }
  const latestNormal = Math.max(...states.map((state2) => state2.normal));
  const windowEnd = hours(prediction?.nextResetWindow?.to);
  const forecastTail = prediction ? Math.min(336, Number.isFinite(windowEnd) ? Math.max(48, windowEnd) : 168) : 0;
  return Math.ceil(Math.max(
    1,
    latestNormal,
    forecastEndHours,
    forecastTail,
    ...[first?.toHours, second?.toHours, secondHours].filter(Number.isFinite)
  ));
}

// src/usage-planner-state.js
var validMultiplier = (value) => paceChoices.some((choice) => choice.multiplier === value);
var intent = (value) => Object.freeze({
  ...value,
  heldResetIndices: Object.freeze([...value.heldResetIndices]),
  requiredResetIndices: Object.freeze([...value.requiredResetIndices])
});
var state = (value) => Object.freeze({ ...value, intent: intent(value.intent) });
function createUsagePlannerState({
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  targetMultiplier = 1,
  forecastEnabled = true,
  usageStrategy = "balanced",
  availabilityMode = "optimistic",
  alertsEnabled = false
} = {}) {
  return state({
    timeZone: timeZone2,
    snapshot: null,
    observedDailyPercent: null,
    result: null,
    displayEndHours: null,
    intent: {
      usageStrategy: validUsageStrategy(usageStrategy) ? usageStrategy : "balanced",
      availabilityMode: validAvailabilityMode(availabilityMode) ? availabilityMode : "optimistic",
      alertsEnabled: alertsEnabled === true,
      targetMultiplier: validMultiplier(targetMultiplier) ? targetMultiplier : 1,
      forecastEnabled: typeof forecastEnabled === "boolean" ? forecastEnabled : true,
      // resetCountOverride: null follows the confidence rule; 0–2 is the user's choice.
      assumedResetCount: 0,
      resetCountOverride: null,
      heldResetIndices: [],
      requiredResetIndices: []
    }
  });
}
function activePlannerPrediction(planner2) {
  return planner2.intent.forecastEnabled ? planner2.snapshot?.prediction ?? null : null;
}
function usagePlannerInput(planner2) {
  if (!planner2.snapshot) return null;
  const { snapshot, intent: intent2, timeZone: timeZone2 } = planner2;
  return {
    ...snapshot.usageSnapshot ? { usageSnapshot: snapshot.usageSnapshot } : { input: snapshot.input },
    now: new Date(snapshot.now),
    timeZone: timeZone2,
    recommendationMode: snapshot.recommendationMode ?? DEFAULT_RECOMMENDATION_MODE,
    prediction: activePlannerPrediction(planner2),
    averagePercentPerDay: planner2.observedDailyPercent,
    usageStrategy: intent2.usageStrategy,
    availabilityMode: intent2.availabilityMode,
    alertsEnabled: intent2.alertsEnabled,
    paceMultiplier: intent2.targetMultiplier,
    heldResetIndices: intent2.heldResetIndices,
    requiredResetIndices: intent2.requiredResetIndices,
    assumedResetCount: intent2.resetCountOverride ?? "auto"
  };
}
function calculate(planner2, newSnapshot) {
  const result = planUsagePath(usagePlannerInput(planner2));
  const assumedResetCount = result.forecastScenario?.selected ? result.forecastScenario.secondSelected ? 2 : 1 : 0;
  return state({
    ...planner2,
    result,
    observedDailyPercent: result.available ? result.averagePercentPerDay : planner2.observedDailyPercent,
    displayEndHours: newSnapshot && result.available ? strategyTimeRange(result, { prediction: planner2.snapshot.prediction }) : planner2.displayEndHours,
    intent: { ...planner2.intent, assumedResetCount }
  });
}
function updateUsagePlanner(planner2, action) {
  const previous = planner2.intent;
  let next;
  if (action.type === "invalidate") return state({ ...planner2, result: null, displayEndHours: null });
  if (action.type === "import-mcp-plan") {
    const session = structuredClone(action.session), result = session.result, options = session.planning ?? {};
    const refreshHours = () => Math.max(0, (Date.parse(session.usageSnapshot?.weekly?.resetAt ?? result.originalNormalResetAt ?? result.normalResetAt) - Date.parse(result.now)) / 36e5);
    const input2 = session.input ?? {
      weeklyRemaining: session.usageSnapshot.weekly.remainingPercent,
      weeklyResetDays: Math.floor(refreshHours() / 24),
      weeklyResetHours: Math.floor(refreshHours() % 24),
      resetDates: result.resets?.map((reset) => reset.expiresOn) ?? []
    };
    const snapshot = Object.freeze({
      input: Object.freeze(input2),
      usageSnapshot: session.usageSnapshot,
      now: result.now,
      prediction: session.prediction,
      recommendationMode: options.recommendationMode ?? DEFAULT_RECOMMENDATION_MODE
    });
    return state({
      ...planner2,
      timeZone: session.timeZone,
      snapshot,
      result,
      observedDailyPercent: result.averagePercentPerDay ?? null,
      displayEndHours: result.available ? strategyTimeRange(result, { prediction: session.prediction }) : null,
      intent: {
        ...previous,
        usageStrategy: options.usageStrategy ?? "balanced",
        forecastEnabled: !!session.prediction,
        availabilityMode: options.availabilityMode ?? "optimistic",
        alertsEnabled: options.alertsEnabled === true,
        targetMultiplier: options.paceMultiplier ?? 1,
        heldResetIndices: options.heldResetIndices ?? [],
        requiredResetIndices: options.requiredResetIndices ?? [],
        assumedResetCount: result.forecastScenario?.secondSelected ? 2 : result.forecastScenario?.selected ? 1 : 0
      }
    });
  }
  if (action.type === "new-snapshot") {
    const input2 = structuredClone(action.input);
    if (Array.isArray(input2.resetDates)) Object.freeze(input2.resetDates);
    const snapshot = Object.freeze({
      input: Object.freeze(input2),
      now: new Date(action.now).toISOString(),
      prediction: action.prediction ? structuredClone(action.prediction) : null
    });
    next = {
      ...planner2,
      snapshot,
      result: null,
      displayEndHours: null,
      observedDailyPercent: input2.weeklyRemaining === 100 ? planner2.observedDailyPercent : null,
      intent: { ...previous, assumedResetCount: 0, resetCountOverride: null, heldResetIndices: [], requiredResetIndices: [] }
    };
    return calculate(next, true);
  }
  if (!planner2.result) return planner2;
  if (action.type === "set-strategy") {
    if (!validUsageStrategy(action.strategy)) return planner2;
    next = { ...previous, usageStrategy: action.strategy };
  } else if (action.type === "set-availability-mode") {
    if (!validAvailabilityMode(action.mode)) return planner2;
    next = { ...previous, availabilityMode: action.mode };
  } else if (action.type === "toggle-alerts") {
    const enabled = !previous.alertsEnabled, availability = planner2.result.recommendation?.availability;
    return state({
      ...planner2,
      intent: { ...previous, alertsEnabled: enabled },
      result: availability ? { ...planner2.result, recommendation: {
        ...planner2.result.recommendation,
        availability: { ...availability, notification: {
          ...availability.notification,
          enabled,
          shouldNotify: enabled && availability.status !== "on-track"
        } }
      } } : planner2.result
    });
  } else if (action.type === "toggle-forecast") {
    const forecastEnabled = !previous.forecastEnabled;
    next = {
      ...previous,
      forecastEnabled,
      assumedResetCount: forecastEnabled ? previous.assumedResetCount : 0
    };
  } else if (action.type === "toggle-assumption") {
    const sequence = Number(action.sequence ?? 1);
    if (![1, 2].includes(sequence)) return planner2;
    const count = previous.assumedResetCount;
    const chosen = sequence === 2 ? count === 2 ? 1 : 2 : count ? 0 : 1;
    next = {
      ...previous,
      ...previous.usageStrategy === "keep-available" ? { availabilityMode: chosen ? "optimistic" : "cautious" } : {},
      assumedResetCount: chosen,
      resetCountOverride: chosen
    };
  } else if (action.type === "toggle-bank") {
    const index = Number(action.index), choice = planner2.result.backupChoices?.find((choice2) => choice2.index === index);
    if (!choice || choice.actionable === false) return planner2;
    next = {
      ...previous,
      heldResetIndices: choice.used ? [.../* @__PURE__ */ new Set([...previous.heldResetIndices, index])] : previous.heldResetIndices.filter((item) => item !== index),
      requiredResetIndices: choice.used ? previous.requiredResetIndices.filter((item) => item !== index) : [.../* @__PURE__ */ new Set([...previous.requiredResetIndices, index])]
    };
  } else return planner2;
  return calculate({ ...planner2, intent: next }, false);
}

// src/strategy-tree-view.js
function strategyTreeView(result) {
  const round8 = (value) => Number(value.toFixed(1));
  const date = (value) => new Intl.DateTimeFormat("zh-CN", {
    timeZone: result.timeZone,
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const pace = (action) => {
    if (!action.multiplier) return "\u8FD9\u4E00\u6B65\u5148\u4E0D\u7528";
    const relative = action.multiplier / result.startingPoint.multiplier;
    if (Math.abs(relative - 1) < 1e-6) return "\u6309\u4F60\u7684\u8D77\u70B9\u7528";
    if (action.id.startsWith("use-before-")) return `\u63D0\u524D\u7528\u5B8C\u5F53\u524D\u989D\u5EA6 \xB7 \u8D77\u70B9\u7684 ${round8(relative)} \u500D`;
    return relative < 1 ? `\u964D\u5230\u8D77\u70B9\u7684 ${round8(relative * 100)}%` : `\u63D0\u9AD8\u5230\u8D77\u70B9\u7684 ${round8(relative * 100)}%`;
  };
  return result.decisionTree.levels.map((level) => {
    const actions = level.actions.map((item) => {
      const step = item.outcome;
      const bank = step.events.find((event) => event.kind === "backup");
      const supply = !item.action.multiplier ? "\u4FDD\u7559\u73B0\u6709\u8D44\u6E90" : bank ? `${bank.atHours <= step.startHours + 1e-7 ? "\u73B0\u5728" : date(bank.at)}\u7528\u5907\u7528 reset` : level.state.resets ? "\u8FD9\u4E00\u6B65\u4E0D\u7528\u5907\u7528 reset" : "\u4F7F\u7528\u73B0\u6709\u989D\u5EA6";
      const effects = [`\u989D\u5EA6 ${round8(level.state.quota)}% \u2192 ${round8(step.remainingAfter)}%`];
      if (step.resetIndicesUsed.length) effects.push(`\u7528 ${step.resetIndicesUsed.length} \u4E2A\u5907\u7528`);
      if (step.resetIndicesExpired.length) effects.push(`${step.resetIndicesExpired.length} \u4E2A\u5907\u7528\u5C06\u8FC7\u671F`);
      if (step.pauseHours > 1e-7) effects.push(`\u505C\u7528 ${round8(step.pauseHours)} \u5C0F\u65F6`);
      const fallback = [];
      fallback.push(item.fallback.firstPauseAt ? `${date(item.fallback.firstPauseAt)}\u987B\u6682\u505C` : "\u53EF\u63A5\u6B63\u5E38\u5237\u65B0");
      if (item.fallback.expiredResets) fallback.push(`${item.fallback.expiredResets} \u4E2A\u5907\u7528\u4F1A\u8FC7\u671F`);
      const events = step.events.filter((event) => event.kind === "backup").map((event) => `${date(event.at)}\u7528 ${event.expiresOn} \u5230\u671F\u7684\u5907\u7528\uFF1B\u8986\u76D6 ${round8(event.overwrittenPercent)}% \u5F53\u524D\u989D\u5EA6`);
      return {
        ...item,
        title: pace(item.action),
        supply,
        effects: effects.join(" \xB7 "),
        fallbackText: fallback.join(" \xB7 "),
        events,
        dailyPercent: round8(result.averagePercentPerDay * item.action.multiplier),
        // Each action category remains reachable even when several have the
        // same intensity: immediate redemption, waiting, bridging and rest.
        category: item.action.multiplier === 0 ? "pause" : item.action.id.startsWith("use-before-") ? "deadline" : bank ? item.action.bankMode === "now" ? "bank-now" : "bank-later" : "hold"
      };
    });
    const preview = /* @__PURE__ */ new Set([actions[0].id]);
    for (const category of ["deadline", "hold", "bank-now", "bank-later", "credits", "pause"]) {
      const item = actions.find((action) => action.category === category);
      if (item) preview.add(item.id);
    }
    for (const id of ["steady", "more", "flexible"]) {
      const item = actions.find((action) => action.action.id === id);
      if (item) preview.add(item.id);
    }
    preview.add(level.selectedActionId);
    const selected = actions.find((action) => action.id === level.selectedActionId);
    const following = result.decisionTree.levels[level.index + 1];
    const bankNext = following?.actions.find((action) => action.id === following.selectedActionId)?.outcome.resetIndicesUsed.length;
    return {
      ...level,
      date: date(level.startAt),
      until: date(level.endAt),
      actions,
      selected,
      previewActionIds: [...preview],
      headline: selected.action.multiplier === 0 ? "\u8FD9\u4E00\u6B65\u5148\u6682\u505C" : selected.action.id === "use-before-deadline" && (selected.outcome.resetIndicesUsed.length || bankNext) ? "\u5148\u6D88\u8017\u5F53\u524D\u989D\u5EA6\uFF0C\u518D\u5728\u5230\u671F\u524D\u7528\u5907\u7528 reset" : selected.action.bankMode === "now" ? "\u73B0\u5728\u7528\u5907\u7528 reset\uFF0C\u518D\u7EE7\u7EED\u4F7F\u7528" : `${selected.title}${selected.outcome.resetIndicesUsed.length ? "\uFF0C\u5230\u65F6\u7528\u5907\u7528 reset" : ""}`
    };
  });
}
function strategyMilestoneView(result) {
  const raw = strategyTreeView(result);
  const time = (value) => new Intl.DateTimeFormat("zh-CN", {
    timeZone: result.timeZone,
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const day = (value) => new Intl.DateTimeFormat("zh-CN", {
    timeZone: result.timeZone,
    month: "long",
    day: "numeric"
  }).format(new Date(value));
  return result.milestones.segments.map((segment) => {
    const source = raw[segment.sourceLevelIndex];
    const events = segment.events.filter((event) => ["backup", "expiry"].includes(event.kind));
    const preciseStart = segment.startReasons.some((reason) => ["depletion", "backup", "expiry"].includes(reason));
    const preciseEnd = segment.endReasons.some((reason) => ["depletion", "backup", "expiry", "normal-refresh"].includes(reason));
    const outcome = {
      ...source.selected.outcome,
      startHours: segment.startHours,
      endHours: segment.endHours,
      startAt: segment.startAt,
      endAt: segment.endAt,
      multiplier: segment.multiplier,
      remainingBefore: segment.state.quota,
      remainingAfter: segment.endState.quota,
      resetsRemaining: segment.endState.resets,
      creditsRemaining: segment.endState.credits,
      events,
      usedDays: segment.usedPercent / result.averagePercentPerDay,
      pauseHours: segment.multiplier ? 0 : segment.endHours - segment.startHours
    };
    const selected = {
      ...source.selected,
      dailyPercent: Number(segment.dailyPercent.toFixed(1)),
      outcome,
      action: {
        ...source.selected.action,
        multiplier: segment.multiplier,
        id: segment.multiplier ? source.selected.action.id : "pause"
      }
    };
    const expiry = events.find((event) => event.kind === "expiry");
    const date = segment.startReasons.includes("current") ? "\u73B0\u5728" : expiry ? `${expiry.expiresOn.slice(5).replace("-", "/")}\u7ED3\u675F \xB7 \u5907\u7528\u5230\u671F` : preciseStart ? `\u9884\u8BA1 ${time(segment.startAt)}` : `${day(segment.startAt)} \xB7 \u8C03\u6574\u7528\u91CF`;
    const until = preciseEnd ? time(segment.endAt) : `\u7EA6 ${day(segment.endAt)}`;
    const endDescription = segment.endReasons.includes("normal-refresh") ? `${until}\u6B63\u5E38\u5237\u65B0` : segment.endReasons.includes("depletion") ? `\u9884\u8BA1 ${until}\u8017\u5C3D` : segment.endReasons.includes("pace-change") ? `${until}\u8C03\u6574\u7528\u91CF` : until;
    return {
      ...source,
      index: segment.index,
      sourceLevelIndex: segment.sourceLevelIndex,
      canChoose: segment.canChoose,
      startAt: segment.startAt,
      endAt: segment.endAt,
      state: segment.state,
      selected,
      date,
      until,
      endDescription,
      actions: segment.canChoose ? source.actions : [],
      resetProbability: segment.conditionalResetProbability,
      cumulativeResetProbability: segment.cumulativeResetProbability,
      creditsBridge: segment.events.find((event) => event.kind === "credits-advisory"),
      startReasons: segment.startReasons
    };
  });
}

// src/strategy-quota-funnel.js
var coordinate = (value) => Number(value.toFixed(6));
function quotaFunnelGeometry(milestones, {
  startX,
  stageWidth,
  centerY,
  maxThickness = 48,
  terminalWidth = 204,
  xAtHours = null,
  restPeriods = [],
  shape = "symmetric"
} = {}) {
  const half = (quota) => maxThickness * quota / 200;
  const top = (height) => centerY - (shape === "area" ? height * 2 : height);
  const bottom = (height) => shape === "area" ? centerY : centerY + height;
  const xAt = (hours, index) => xAtHours ? xAtHours(hours) : startX + index * stageWidth;
  const bands = milestones.segments.map((segment, index) => {
    const startQuota = milestones.points[index].stateAfter.quota;
    const endQuota = milestones.points[index + 1].stateBefore.quota;
    const x1 = xAt(segment.startHours, index);
    const x2 = xAt(segment.endHours, index + 1);
    const rest = restPeriods.some((phase) => phase.startHours <= segment.startHours + 1e-6 && phase.endHours >= segment.endHours - 1e-6);
    return {
      kind: rest ? "rest" : segment.multiplier ? "usage" : "pause",
      index,
      x1,
      x2,
      centerY,
      startQuota,
      endQuota,
      startAt: segment.startAt,
      endAt: segment.endAt,
      startHalf: half(startQuota),
      endHalf: half(endQuota)
    };
  });
  const refills = milestones.points.filter((point) => point.events.some((event) => ["backup", "normal-refresh", "assumed-extra-reset"].includes(event.kind))).map((point) => ({
    kind: point.events.some((event) => event.kind === "assumed-extra-reset") ? "assumed-extra" : point.events.some((event) => event.kind === "normal-refresh") ? "normal" : "backup",
    sequence: point.events.find((event) => event.kind === "assumed-extra-reset")?.sequence ?? null,
    x: xAt(point.hours, milestones.points.indexOf(point)),
    centerY,
    before: point.stateBefore.quota,
    after: point.stateAfter.quota,
    at: point.at
  }));
  if (["normal-refresh", "assumed-extra-reset"].includes(milestones.endKind)) {
    const point = milestones.points.at(-1);
    const x = xAt(point.hours, milestones.segments.length);
    if (!refills.some((refill) => refill.at === point.at)) refills.push({
      kind: "normal",
      x,
      centerY,
      before: point.stateBefore.quota,
      after: point.stateAfter.quota,
      at: point.at
    });
    bands.push({
      kind: milestones.endKind === "assumed-extra-reset" ? "assumed-refresh" : "refresh",
      x1: x,
      x2: x + terminalWidth,
      centerY,
      startQuota: point.stateAfter.quota,
      endQuota: point.stateAfter.quota,
      startHalf: half(point.stateAfter.quota),
      endHalf: half(point.stateAfter.quota)
    });
  }
  for (const band of bands) {
    const { x1, x2, startHalf, endHalf } = band;
    band.path = `M ${x1} ${coordinate(top(startHalf))} L ${x2} ${coordinate(top(endHalf))} L ${x2} ${coordinate(bottom(endHalf))} L ${x1} ${coordinate(bottom(startHalf))} Z`;
    band.baseline = `M ${x1} ${centerY} H ${x2}`;
    band.labels = band.kind === "rest" ? [] : [
      { x: x1 + 8, y: coordinate(bottom(startHalf) + 16), quota: band.startQuota, anchor: "start" },
      ...["refresh", "assumed-refresh"].includes(band.kind) ? [] : [{ x: x2 - 8, y: coordinate(bottom(endHalf) + 16), quota: band.endQuota, anchor: "end" }]
    ];
  }
  for (const refill of refills) {
    refill.path = `M ${refill.x} ${coordinate(top(half(refill.after)))} V ${coordinate(bottom(half(refill.after)))}`;
  }
  return { bands, refills, maxThickness, shape };
}

// src/strategy-time-axis.js
var HOUR15 = 36e5;
function strategyTimeAxis({ now, timeZone: timeZone2, endHours, dayWidth = 180, padding = 40, leftPadding = padding }) {
  const start = Date.parse(now);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone2,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const date = Object.fromEntries(formatter.formatToParts(start).map((part) => [part.type, part.value]));
  const midnight = (offset) => {
    const target = Date.UTC(+date.year, +date.month - 1, +date.day + offset);
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const p = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
      const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const corrected = target - (local - instant);
      if (corrected === instant) return instant;
      instant = corrected;
    }
    return instant;
  };
  const label = new Intl.DateTimeFormat("zh-CN", { timeZone: timeZone2, month: "numeric", day: "numeric" });
  const days = [];
  for (let offset = 0; ; offset++) {
    const from = midnight(offset), to = midnight(offset + 1);
    days.push({
      x: leftPadding + offset * dayWidth,
      width: dayWidth,
      startAt: new Date(from).toISOString(),
      endAt: new Date(to).toISOString(),
      startHours: (from - start) / HOUR15,
      endHours: (to - start) / HOUR15,
      label: label.format(from + HOUR15)
    });
    if (to >= start + endHours * HOUR15) break;
  }
  const xAtHours = (hours) => {
    const day = days.find((day2) => hours >= day2.startHours && hours < day2.endHours) ?? days.at(-1);
    return day.x + (hours - day.startHours) / (day.endHours - day.startHours) * dayWidth;
  };
  return {
    days,
    dayWidth,
    padding,
    leftPadding,
    nowX: xAtHours(0),
    xAtHours,
    width: leftPadding + padding + days.length * dayWidth
  };
}

// src/reset-probability-plot.js
var coordinate2 = (value) => Number(value.toFixed(4));
function resetProbabilityBins({ prediction, now, horizonHours = 336, binHours = 1 }) {
  if (!prediction) return null;
  return hourlyResetDistribution({
    now,
    horizonHours,
    binHours,
    probabilityByHours: (hours) => resetProbabilityByHours(prediction, hours)
  });
}
function layoutResetProbabilityPlot({ distribution, endHours, xAtHours, topY, height = 76 }) {
  if (!distribution) return null;
  const visible = distribution.bins.filter((bin) => bin.endHours <= endHours + 1e-8);
  if (!visible.length) return null;
  const max = distribution.maxDensityPerHour;
  const bottomY = topY + height;
  const bins = visible.map((bin) => ({
    ...bin,
    x1: xAtHours(bin.startHours),
    x2: xAtHours(bin.endHours),
    x: xAtHours((bin.startHours + bin.endHours) / 2),
    y: bottomY - (max > 0 ? bin.densityPerHour / max * height : 0)
  }));
  const first = bins[0], last = bins.at(-1);
  const line = `M ${coordinate2(first.x1)} ${coordinate2(first.y)} ` + bins.map((bin) => `L ${coordinate2(bin.x)} ${coordinate2(bin.y)}`).join(" ") + ` L ${coordinate2(last.x2)} ${coordinate2(last.y)}`;
  return {
    bins,
    topY,
    height,
    bottomY,
    startX: first.x1,
    endX: last.x2,
    endHours: last.endHours,
    endAt: last.endAt,
    maxDensityPerHour: max,
    cumulativeProbability: last.cumulativeProbability,
    tailProbability: 1 - last.cumulativeProbability,
    densityPath: line,
    areaPath: `${line} L ${coordinate2(last.x2)} ${bottomY} L ${coordinate2(first.x1)} ${bottomY} Z`,
    basis: distribution.basis
  };
}
function layoutResetProbabilityPeaks({ plot, timeZone: timeZone2, focus = null, otherLabels = [], cumulativeAtHours }) {
  if (!plot || !plot.maxDensityPerHour) return [];
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone2, year: "numeric", month: "2-digit", day: "2-digit" });
  const byDay = /* @__PURE__ */ new Map();
  for (let index = 1; index < plot.bins.length - 1; index++) {
    const bin = plot.bins[index];
    if (bin.densityPerHour <= plot.bins[index - 1].densityPerHour || bin.densityPerHour < plot.bins[index + 1].densityPerHour || bin.densityPerHour < plot.maxDensityPerHour * 0.2) continue;
    const key = day.format(new Date((Date.parse(bin.startAt) + Date.parse(bin.endAt)) / 2));
    if (!byDay.has(key) || bin.densityPerHour > byDay.get(key).densityPerHour) byDay.set(key, bin);
  }
  const occupied = [...focus ? [{ left: focus.left, width: focus.width, y: focus.y, height: 34 }] : [], ...otherLabels];
  const peaks = [];
  for (const bin of [...byDay.values()].sort((a, b) => b.densityPerHour - a.densityPerHour)) {
    if (focus && Math.abs(bin.x - focus.x) < 1e-6) continue;
    if (focus && bin.x < focus.x) continue;
    const pointHours = (bin.startHours + bin.endHours) / 2;
    const cumulativeProbability = cumulativeAtHours(pointHours);
    if (cumulativeProbability < 0.01 || cumulativeProbability > 0.99) continue;
    const width = 84, height = 16;
    const box = {
      left: Math.max(plot.startX, Math.min(plot.endX - width, bin.x - width / 2)),
      y: bin.y - 24,
      width,
      height
    };
    if (occupied.some((other) => box.left < other.left + other.width + 8 && box.left + width + 8 > other.left && box.y < other.y + other.height + 6 && box.y + height + 6 > other.y)) continue;
    occupied.push(box);
    peaks.push({
      ...box,
      x: bin.x,
      curveY: bin.y,
      pointHours,
      at: new Date(Math.round((Date.parse(bin.startAt) + Date.parse(bin.endAt)) / 2)).toISOString(),
      cumulativeProbability
    });
  }
  return peaks.sort((a, b) => a.pointHours - b.pointHours);
}

// src/components/timeline-lane-label.js
function renderTimelineLaneLabel({ id, x, y, width, height = 52, title, detail, note = "", tooltip = "", inline = false }, escape3) {
  const content = inline ? `<span class="timeline-lane-text">${escape3([title, detail, note].filter(Boolean).join(" "))}</span>` : `<strong>${escape3(title)}</strong><span>${escape3(detail)}</span>${note ? `<small class="timeline-lane-note">${escape3(note)}</small>` : ""}`;
  return `<div class="timeline-lane-label" data-lane-label="${escape3(id)}"${inline ? " data-lane-inline" : ""} title="${escape3(tooltip || [title, detail, note].filter(Boolean).join(" \xB7 "))}" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px">${content}</div>`;
}

// src/components/reset-element.js
var round3 = (value) => Number(value.toFixed(1));
var probability = (value) => value > 0 && value < 1e-4 ? "&lt;0.01" : round3(value * 100);
var name = (sequence, locale) => translator(locale)(sequence === 1 ? "\u9996\u6B21" : "\u7B2C\u4E8C\u6B21");
var position = ({ left, x, y, width, height, viewportWidth }) => `data-reset-position style="--reset-left:${viewportWidth ? `${(left ?? x) / viewportWidth * 100}%` : `${left ?? x}px`};--reset-top:${y}px;--reset-width:${viewportWidth ? `${width / viewportWidth * 100}%` : `${width}px`};--reset-height:${height ?? 0}px"`;
function resetOpportunityLayout(width = Infinity) {
  const stacked = width < 80;
  return { stacked, height: stacked ? 48 : 32 };
}
function renderResetOpportunity(opportunity, { timeZone: timeZone2, escape: escape3, locale = "zh-CN", compact = false, width = Infinity, dateOnly = false }) {
  const t2 = translator(locale);
  if (!opportunity) return "";
  const time = new Intl.DateTimeFormat(uiLocale(locale), {
    timeZone: timeZone2,
    month: uiLocale(locale) === "zh-CN" ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const until = time.format(new Date(opportunity.until));
  const sequence = Math.max(1, Math.trunc(Number(opportunity.nextExtraResetSequence)) || 1);
  const fullLabel = t2("\u81F3\u5C11\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%", { percent: probability(opportunity.probability) });
  const layout = resetOpportunityLayout(width);
  const day = compact ? new Intl.DateTimeFormat(uiLocale(locale), { timeZone: timeZone2, month: "2-digit", day: "2-digit" }).format(new Date(opportunity.until)) : null;
  const clock = compact ? new Intl.DateTimeFormat("en-GB", { timeZone: timeZone2, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(opportunity.until)) : null;
  const content = compact ? `<span class="phase-probability-value">${probability(opportunity.probability)}%</span><span class="phase-probability-until"><time datetime="${escape3(opportunity.until)}"><span>${escape3(day)}</span>${dateOnly ? "" : ` <span>${escape3(clock)}</span>`}</time></span>` : `<span>${fullLabel}</span><span class="phase-probability-until">${escape3(t2("{time}\u4E4B\u524D", { time: until }))}</span>`;
  return `<small class="reset-element phase-reset-opportunity" data-reset-element="${sequence >= 2 ? 2 : 1}" data-reset-opportunity data-next-extra-sequence="${sequence}" data-probability="${opportunity.probability}" ${compact ? `data-compact-probability data-cutoff-layout="${layout.stacked ? "stacked" : "inline"}"` : ""} title="${escape3(fullLabel + " \xB7 " + t2("\u622A\u81F3 {time}\uFF1B\u4EE5\u672C\u6BB5\u5F00\u59CB\u524D\u672A\u518D\u53D1\u751F\u989D\u5916reset\u4E3A\u6761\u4EF6{renewal}", { time: until, renewal: opportunity.previousExtraResetAt ? t2("\uFF0C\u4ECE\u6700\u8FD1\u9009\u62E9\u7684\u989D\u5916reset\u91CD\u65B0\u8BA1\u65F6") : "" }))}">${content}</small>`;
}
var resetActionCopy = {
  1: { idle: "\u8BA1\u5165\u9996\u6B21 reset", selected: "\u5DF2\u8BA1\u5165\u9996\u6B21 reset", cancelHint: "\u53D6\u6D88\u9996\u6B21\u53CA\u540E\u7EE7\u5047\u8BBE" },
  2: { idle: "\u8BA1\u5165\u4E24\u6B21 reset", selected: "\u5DF2\u8BA1\u5165\u7B2C\u4E8C\u6B21 reset", cancelHint: "\u53D6\u6D88\u7B2C\u4E8C\u6B21\u5047\u8BBE\uFF0C\u4FDD\u7559\u9996\u6B21" }
};
function resetAssumptionState({ sequence, selected, locale = "zh-CN" }) {
  const t2 = translator(locale);
  const copy = resetActionCopy[sequence === 2 ? 2 : 1];
  return {
    title: t2(selected ? copy.selected : copy.idle),
    lines: [],
    hint: t2(selected ? copy.cancelHint : copy.idle),
    cancel: selected ? t2("\u4E0D\u8BA1\u5165") : ""
  };
}
function resetAssumptionContent(props) {
  const { title, lines } = resetAssumptionState(props);
  return { title, lines };
}
function renderMode({ sequence, focus, plot, vertical = false, escape: escape3, locale }) {
  const t2 = translator(locale);
  if (!focus) return "";
  const data = sequence === 1 ? `data-reset-estimate="${escape3(focus.pointAt)}" data-estimate-cdf="${focus.cumulativeProbability}" data-estimate-probability="${focus.probability}"` : `data-reset-sequence="2" data-reset-at="${escape3(focus.pointAt)}" data-conditional-on="${escape3(focus.conditionalOn)}"`;
  if (!plot && sequence === 1 && !vertical) {
    const mode = ["maximum-hour-window-mass", "maximum-hour-window-density"].includes(focus.method);
    return `<div class="forecast-mode" ${data} ${position(focus)} title="${t2(mode ? "\u6807\u7EBF\u5BF9\u5E94\u6982\u7387\u5206\u5E03\u7684\u6700\u9AD8\u5CF0\u3002" : "\u4E0A\u6B21reset\u52A0\u8FD1\u671F\u5E73\u5747\u95F4\u9694\uFF0C\u518D\u6821\u51C6\u5230\u5E38\u89C1\u53D1\u5E03\u949F\u70B9\u7684\u53C2\u8003\u65F6\u95F4\u3002")}${t2("\u5DE6\u53F3\u4E3A\u4F30\u8BA1\u8303\u56F4\u4E4B\u5916\u7684\u6982\u7387\u3002")}"><span data-estimate-earlier="${focus.earlierProbability}">${t2("\u2190 \u66F4\u65E9 {percent}%", { percent: round3(focus.earlierProbability * 100) })}</span><strong>${t2(mode ? "\u6700\u53EF\u80FD\u989D\u5916 reset" : "\u9884\u8BA1\u989D\u5916 reset")}<small>${escape3(focus.label)}</small></strong><span data-estimate-later="${focus.laterProbability}">${t2("\u66F4\u665A {percent}% \u2192", { percent: round3(focus.laterProbability * 100) })}</span></div>`;
  }
  const className = sequence === 1 ? "forecast-mode forecast-mode-on-plot" : "forecast-following";
  return `<div class="${className}" ${data} data-reset-marker ${position(focus)} aria-label="${name(sequence, locale)} ${t2(focus.planned ? "\u89C4\u5212\u65F6\u523B" : "\u6700\u53EF\u80FD")} reset \xB7 ${escape3(focus.label)}" title="${t2(focus.planned ? "\u6807\u7EBF\u662F\u89C4\u5212\u8BA1\u5165\u8FD9\u6B21 reset \u7684\u4FDD\u5B88\u65F6\u523B\uFF1A\u6B63\u5E38\u5237\u65B0\u524D\u53EF\u80FD\u53D1\u751F\u7684\u90E8\u5206\uFF0C\u6709 75% \u5728\u6B64\u4E4B\u524D\u3002" : "\u6807\u7EBF\u5BF9\u5E94\u672C\u6761\u5206\u5E03\u6700\u9AD8\u5CF0\u3002")}${sequence === 2 ? t2("\u7B2C\u4E8C\u6B21\u4EE5\u9996\u6B21\u5728\u9884\u6D4B\u70B9\u53D1\u751F\u4E3A\u524D\u63D0\u3002") : ""}"><strong>${escape3(focus.planned ? focus.label : `${t2("\u6700\u53EF\u80FD")} ${focus.clockLabel ?? focus.label}`)}<small>${t2("\u7D2F\u8BA1")} ${probability(focus.cumulativeProbability)}%</small></strong></div>`;
}
function renderAction(action, escape3, locale) {
  if (!action) return "";
  const sequence = action.sequence ?? 1;
  const state2 = resetAssumptionState({ sequence, selected: action.selected, locale });
  return `<button type="button" class="graph-node graph-forecast-assumption" data-node-id="${escape3(action.id)}" data-assume-reset aria-pressed="${action.selected}" data-assumption-sequence="${sequence}" title="${escape3(state2.hint)}" ${position(action)}><span class="reset-action-heading"><strong>${escape3(action.title ?? state2.title)}</strong>${state2.cancel ? `<small class="reset-action-cancel">${escape3(state2.cancel)}</small>` : ""}</span>${(action.lines ?? state2.lines).map((line) => `<span>${escape3(line)}</span>`).join("")}</button>`;
}
function renderResetElement({
  sequence = 1,
  plot = null,
  focus = null,
  peaks = [],
  action = null,
  connectors = [],
  refills = [],
  guideEndY,
  orientation = "horizontal",
  guideStartX,
  captionPosition,
  timeZone: timeZone2 = Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale = "zh-CN",
  laneLabel = null
}, escape3) {
  const t2 = translator(locale);
  const vertical = orientation === "vertical";
  const date = new Intl.DateTimeFormat(uiLocale(locale), { timeZone: timeZone2, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const plotSvg = plot ? `<g class="reset-density-series" data-density-sequence="${sequence}" data-reset-density-plot data-cumulative-probability="${plot.cumulativeProbability}" data-tail-probability="${plot.tailProbability}"><path class="reset-density-baseline" d="M ${plot.startX} ${plot.bottomY} H ${plot.endX}"/><path class="reset-density-area" d="${plot.areaPath}"/><path class="reset-density-line" d="${plot.densityPath}"/>${plot.bins.map((bin) => `<rect class="reset-density-hit" x="${bin.x1}" y="${plot.topY}" width="${bin.x2 - bin.x1}" height="${plot.height}" data-bin-probability="${bin.probability}" data-bin-cdf="${bin.cumulativeProbability}"><title>${t2(sequence === 2 ? "\u7B2C\u4E8C\u6B21\uFF08\u5047\u8BBE\u9996\u6B21\u53D1\u751F\uFF09" : "\u9996\u6B21")} reset \xB7 ${escape3(date.format(new Date(bin.endAt)))} \xB7 ${t2("\u7D2F\u8BA1")} ${probability(bin.cumulativeProbability)}%</title></rect>`).join("")}</g>` : "";
  const peakSvg = peaks.map((peak) => vertical ? `<path class="reset-peak-leader" d="M ${peak.curveX + 4} ${peak.timeY} H ${peak.left - 2}"/><circle class="reset-peak-point" cx="${peak.curveX}" cy="${peak.timeY}" r="2.5"/>` : `<path class="reset-peak-leader" d="M ${peak.x} ${peak.curveY - 4} V ${peak.y + peak.height}"/><circle class="reset-peak-point" cx="${peak.x}" cy="${peak.curveY}" r="2.5"/>`).join("");
  const guide = focus ? vertical ? `<path class="${sequence === 1 ? "forecast-mode-guide" : "forecast-following-guide"}" d="M ${guideStartX} ${focus.x} H ${plot?.bottomY ?? guideStartX}"/><circle class="${sequence === 1 ? "forecast-mode-point" : "forecast-following-point"}" cx="${plot?.topY ?? guideStartX}" cy="${focus.x}" r="3.5"/>` : plot || sequence === 2 ? `<path class="${sequence === 1 ? "forecast-mode-guide" : "forecast-following-guide"}" d="M ${focus.x} ${plot ? plot.topY - 4 : focus.y + 38} V ${guideEndY}"/><circle class="${sequence === 1 ? "forecast-mode-point" : "forecast-following-point"}" cx="${focus.x}" cy="${plot ? plot.topY : focus.y + 38}" r="3.5"/>` : `<path class="forecast-mode-range" d="M ${focus.fromX} ${focus.y + 66} H ${focus.toX}"/><path class="forecast-mode-guide" d="M ${focus.left + focus.width / 2} ${focus.y + 61} L ${focus.x} ${focus.y + 74} V ${guideEndY}"/>` : "";
  const tailLabel = plot && plot.tailProbability >= 0.01 ? t2("\u8303\u56F4\u5916 {percent}%", { percent: probability(plot.tailProbability) }) : "";
  const caption = laneLabel ? renderTimelineLaneLabel({
    ...laneLabel,
    tooltip: [laneLabel.tooltip, t2(sequence === 2 ? "\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u523B\u53D1\u751F\u4E3A\u6761\u4EF6\u3002" : "\u9996\u6B21\u989D\u5916reset\u7684\u6982\u7387\u5206\u5E03\u3002"), tailLabel].filter(Boolean).join(" ")
  }, escape3) : plot ? `<div class="reset-density-caption" ${position(captionPosition ?? { left: plot.startX, y: plot.topY - 62, width: plot.endX - plot.startX })} title="${t2(sequence === 2 ? "\u4EE5\u9996\u6B21\u5728\u6807\u8BB0\u65F6\u523B\u53D1\u751F\u4E3A\u6761\u4EF6\u3002" : "\u9996\u6B21\u989D\u5916reset\u7684\u6982\u7387\u5206\u5E03\u3002")}${tailLabel}"><span>${vertical ? `${name(sequence, locale)} reset` : `${name(sequence, locale)}${uiLocale(locale) === "zh-CN" ? "" : " "}${t2("\u989D\u5916 reset")} \xB7 ${sequence === 2 ? `<span class="reset-caption-condition">${t2("\u5047\u8BBE\u9996\u6B21\u53D1\u751F")}</span>` : t2("\u6982\u7387\u5206\u5E03")}`}</span>${vertical ? `<span>${t2(sequence === 2 ? "\u9996\u6B21\u53D1\u751F\u540E" : "\u6982\u7387\u5206\u5E03")}</span>` : tailLabel ? `<span>${tailLabel}</span>` : ""}</div>` : "";
  const labels = peaks.map((peak) => `<div class="reset-peak-cdf" data-forecast-peak-at="${escape3(peak.at)}" data-peak-sequence="${sequence}" data-probability="${peak.cumulativeProbability}" ${position(peak)} title="${escape3(date.format(new Date(peak.at)))} \xB7 ${t2(sequence === 2 ? "\u4EE5\u9996\u6B21\u53D1\u751F\u4E3A\u524D\u63D0\u7684\u7B2C\u4E8C\u6B21\u7D2F\u8BA1\u6982\u7387" : "\u9996\u6B21\u989D\u5916reset\u7D2F\u8BA1\u6982\u7387")}">${t2("\u7D2F\u8BA1")}${vertical ? `<small>${probability(peak.cumulativeProbability)}%</small>` : ` ${probability(peak.cumulativeProbability)}%`}</div>`).join("");
  const connectionSvg = connectors.map((edge) => `<path class="reset-action-connection edge-${edge.kind}" d="${edge.path}"/>`).join("");
  const refillSvg = refills.map((refill) => `<path class="quota-refill quota-refill-assumed-extra${sequence === 2 ? " quota-refill-sequence-2" : ""}" data-refill-sequence="${sequence}" d="${refill.path}"/>`).join("");
  const state2 = action?.selected ? "assumed" : "forecast";
  const attributes = `class="reset-element" data-reset-element="${sequence}" data-reset-state="${state2}"${vertical ? ' data-reset-orientation="vertical"' : ""}`;
  return {
    svg: `<g ${attributes}>${vertical ? `<g transform="matrix(0 1 1 0 0 0)">${plotSvg}</g>` : plotSvg}${peakSvg}${guide}</g>`,
    overlaySvg: `<g ${attributes}>${connectionSvg}${refillSvg}</g>`,
    html: `<div ${attributes}>${caption}${labels}${renderMode({ sequence, focus, plot, vertical, escape: escape3, locale })}${renderAction(action, escape3, locale)}</div>`
  };
}

// src/usage-timeline-phases.js
function timelineUsagePhases(phases, xAtHours) {
  if (!phases.some((phase) => phase.plannedRest)) return phases.filter((phase, index) => !index || phase.resourceCycle !== phases[index - 1].resourceCycle || phase.constrained || Math.abs(phase.dailyPercent - phases[index - 1].dailyPercent) >= 1e-5);
  const groups = [];
  for (const phase of phases) {
    if (phase.plannedRest) continue;
    const previous = groups.at(-1), last = previous?.at(-1);
    if (last && phase.resourceCycle === last.resourceCycle && !phase.constrained && !last.constrained && Math.abs(phase.dailyPercent - last.dailyPercent) < 1e-5) previous.push(phase);
    else groups.push([phase]);
  }
  const width = (phase) => xAtHours(phase.endHours) - xAtHours(phase.startHours);
  return groups.map((group) => group.reduce((best, phase) => width(phase) > width(best) ? phase : best));
}

// src/strategy-time-layout.js
var round4 = (value) => Number(value.toFixed(1));
var COMPACT_TIMELINE_WIDTH = 480;
var COMPACT_CARD_WIDTH = 112;
function layoutTimeStrategy(result, { prediction = null, viewportWidth, displayEndHours: fixedEndHours = null, locale = "zh-CN" } = {}) {
  const t2 = translator(locale);
  if (!result.predictionEnabled) prediction = null;
  const points = result.milestones.points;
  const end = points.at(-1);
  const forecastMilestones = result.resetForecast?.milestones ?? [];
  const estimate = result.resetForecast?.enabled ? result.resetForecast.timeMode ?? result.resetForecast.timeEstimate : null;
  const following = result.resetForecast?.enabled ? result.resetForecast.followingReset : null;
  const distribution = resetProbabilityBins({
    prediction,
    now: result.now,
    horizonHours: Math.max(336, Math.ceil(estimate?.toHours ?? 0))
  });
  const secondCondition = following?.conditionalOn ?? null;
  const secondDistribution = followingResetDistribution({ prediction, now: result.now, firstAt: secondCondition });
  const windowEnd = (Date.parse(prediction?.nextResetWindow?.to) - Date.parse(result.now)) / 36e5;
  const focusEstimate = distribution ? distribution.mode : estimate;
  const forecastEndHours = distribution ? Math.ceil(Math.max(
    focusEstimate?.toHours ?? 0,
    following?.toHours ?? following?.pointHours ?? 0,
    Math.min(distribution.horizonHours, Number.isFinite(windowEnd) ? Math.max(48, windowEnd) : 168)
  )) : null;
  const displayEndHours = fixedEndHours ?? strategyTimeRange(result, { prediction, forecastEndHours: forecastEndHours ?? 0 });
  if (!Number.isFinite(displayEndHours) || displayEndHours <= 0 || displayEndHours < end.hours - 1e-6)
    throw new Error("\u65E5\u671F\u8F74\u8303\u56F4\u5FC5\u987B\u8986\u76D6\u5B8C\u6574\u8BA1\u5212");
  const plotEndHours = distribution ? displayEndHours : null;
  const forecasts = (result.forecastCalendar ?? []).filter((point) => point.hours <= (distribution ? displayEndHours : end.hours) + 1e-6).map((point) => ({ ...point, calendar: true }));
  for (const point of result.flexibleSchedule ? [] : forecastMilestones) {
    const existing = forecasts.findIndex((item) => Math.abs(item.hours - point.hours) < 1e-6);
    if (existing >= 0) forecasts[existing] = { ...forecasts[existing], kind: point.kind };
    else forecasts.push(point);
  }
  forecasts.sort((a, b) => a.hours - b.hours);
  const compact = Number.isFinite(viewportWidth) && viewportWidth < COMPACT_TIMELINE_WIDTH;
  const laneWidth = compact ? 0 : Number.isFinite(viewportWidth) && viewportWidth < 680 ? 128 : 176;
  const leftPadding = compact ? 6 : laneWidth + 16;
  let axis = strategyTimeAxis({
    now: result.now,
    timeZone: result.timeZone,
    endHours: displayEndHours,
    leftPadding
  });
  if (Number.isFinite(viewportWidth) && viewportWidth > 0) {
    const left = Math.min(leftPadding, Math.max(0, viewportWidth - 2));
    const padding = Math.min(axis.padding, Math.max(0, (viewportWidth - left - 1) / 2));
    const dayWidth = (viewportWidth - left - padding) / axis.days.length;
    axis = strategyTimeAxis({ now: result.now, timeZone: result.timeZone, endHours: displayEndHours, dayWidth, padding, leftPadding: left });
  }
  const dateStride = Math.max(1, Math.ceil(56 / axis.dayWidth));
  const dateLabels = axis.days.filter((day, index) => index % dateStride === 0);
  const time = (value) => new Intl.DateTimeFormat(uiLocale(locale), {
    timeZone: result.timeZone,
    month: uiLocale(locale) === "zh-CN" ? "long" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const clock = (value) => new Intl.DateTimeFormat("en-GB", {
    timeZone: result.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const date = (value) => new Intl.DateTimeFormat(uiLocale(locale), {
    timeZone: result.timeZone,
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
  const plotLabelWidth = Math.max(1, axis.width - axis.leftPadding - 4);
  const clamp3 = (x, width) => Math.max(axis.leftPadding, Math.min(axis.width - width - 4, x));
  const forecastRows = [];
  const displayedForecasts = distribution ? [] : result.flexibleSchedule ? forecasts.filter((point) => clock(point.at) === "00:00" || Math.abs(point.hours - end.hours) < 1e-6) : forecasts;
  const forecastLayout = displayedForecasts.map((point) => {
    const width = Math.min(plotLabelWidth, result.flexibleSchedule ? 132 : point.kind ? 104 : 66);
    const x = axis.xAtHours(point.hours), left = clamp3(x - width / 2, width);
    let row = forecastRows.findIndex((right) => right + 6 <= left);
    if (row < 0) row = forecastRows.length;
    forecastRows[row] = left + width;
    const midnight = clock(point.at) === "00:00";
    const dateLabel = midnight ? `${date(Date.parse(point.at) - 1)}\u7ED3\u675F` : `${date(point.at)} ${clock(point.at)}`;
    return {
      ...point,
      x,
      left,
      y: 37 + row * 42,
      width,
      label: result.flexibleSchedule ? `\u622A\u81F3 ${dateLabel.replace("\u7ED3\u675F", "")}` : point.kind ? `${point.kind === "backup" ? "\u7528\u5907\u7528" : "\u8017\u5C3D"}\u524D \xB7 ${clock(point.at)}` : dateLabel
    };
  });
  const forecastEndY = forecastRows.length ? 37 + forecastRows.length * 42 : 30;
  const probabilityPlot = layoutResetProbabilityPlot({
    distribution,
    endHours: plotEndHours,
    xAtHours: axis.xAtHours,
    topY: forecastEndY + 64,
    height: 42
  });
  const followingPlot = layoutResetProbabilityPlot({
    distribution: secondDistribution,
    endHours: plotEndHours,
    xAtHours: axis.xAtHours,
    topY: (probabilityPlot?.bottomY ?? forecastEndY) + 64,
    height: 42
  });
  const focusWidth = Math.min(probabilityPlot ? 200 : 480, plotLabelWidth);
  const planned = (marker, hours) => marker && Number.isFinite(hours) && hours > 0 ? {
    ...marker,
    pointHours: hours,
    pointAt: new Date(Date.parse(result.now) + hours * 36e5).toISOString(),
    planned: true
  } : marker;
  const firstMarker = planned(focusEstimate, result.forecastScenario?.available ? result.forecastScenario.hours : NaN);
  const secondMarker = planned(following, result.forecastScenario?.following?.available ? result.forecastScenario.following.hours : NaN);
  const forecastFocus = firstMarker ? {
    ...firstMarker,
    x: axis.xAtHours(firstMarker.pointHours),
    fromX: axis.xAtHours(firstMarker.fromHours),
    toX: axis.xAtHours(firstMarker.toHours),
    left: clamp3(axis.xAtHours(firstMarker.pointHours) - focusWidth / 2, focusWidth),
    y: forecastEndY + 8,
    width: focusWidth,
    label: time(firstMarker.pointAt),
    clockLabel: clock(firstMarker.pointAt)
  } : null;
  if (forecastFocus && probabilityPlot) {
    forecastFocus.y = probabilityPlot.topY - 38;
    forecastFocus.cumulativeProbability = resetProbabilityByHours(prediction, firstMarker.pointHours);
  }
  const forecastFollowing = secondMarker ? {
    ...secondMarker,
    x: axis.xAtHours(secondMarker.pointHours),
    left: clamp3(axis.xAtHours(secondMarker.pointHours) - focusWidth / 2, focusWidth),
    width: focusWidth,
    y: followingPlot ? followingPlot.topY - 38 : forecastFocus?.y ?? forecastEndY + 8,
    label: time(secondMarker.pointAt),
    clockLabel: clock(secondMarker.pointAt)
  } : null;
  if (forecastFollowing?.planned) forecastFollowing.cumulativeProbability = followingResetProbabilityByHours(prediction, result.now, secondMarker.pointHours, secondCondition) ?? forecastFollowing.cumulativeProbability;
  const forecastPeaks = compact ? [] : layoutResetProbabilityPeaks({
    plot: probabilityPlot,
    timeZone: result.timeZone,
    focus: forecastFocus,
    otherLabels: forecastFollowing ? [{ ...forecastFollowing, height: 34 }] : [],
    cumulativeAtHours: (hours) => resetProbabilityByHours(prediction, hours)
  });
  const followingPeaks = compact ? [] : layoutResetProbabilityPeaks({
    plot: followingPlot,
    timeZone: result.timeZone,
    focus: forecastFollowing,
    cumulativeAtHours: (hours) => followingResetProbabilityByHours(prediction, result.now, hours, secondCondition)
  });
  const lastPlot = followingPlot ?? probabilityPlot;
  const headingY = lastPlot ? lastPlot.bottomY + 20 : forecastEndY + (forecastFocus ? 92 : 0) + 12;
  const phaseControls = [];
  const phaseWidth = 198;
  const quotaThickness = 40, labelGap = 10, phaseY = headingY + 28;
  const restPeriods = (result.phasePlans ?? []).filter((phase) => phase.plannedRest);
  const shownPhases = timelineUsagePhases(result.phasePlans ?? [], axis.xAtHours);
  for (const [index, phase] of shownPhases.entries()) {
    const startX = axis.xAtHours(phase.startHours);
    const endX = axis.xAtHours(restPeriods.length ? phase.endHours : shownPhases[index + 1]?.startHours ?? phase.endHours);
    const inset = Math.min(compact ? 2 : 8, Math.max(0, (endX - startX) / 4));
    const x = startX + inset;
    phaseControls.push({
      ...phase,
      nextResetOpportunity: null,
      x,
      y: phaseY,
      width: Math.max(1, Math.min(phaseWidth, endX - x - inset)),
      quotaLabel: true,
      compact,
      options: result.paceChoices
    });
  }
  const opportunityHeight = Math.max(0, ...phaseControls.map((phase) => phase.nextResetOpportunity ? resetOpportunityLayout(phase.width).height : 0));
  const labelHeight = Math.max(34, 20 + (opportunityHeight ? 16 + opportunityHeight : 0));
  const centerY = phaseY + labelHeight + labelGap + quotaThickness;
  for (const phase of phaseControls) Object.assign(phase, { labelHeight, quotaAnchorY: centerY - quotaThickness });
  const funnel = quotaFunnelGeometry(result.milestones, {
    centerY,
    xAtHours: axis.xAtHours,
    maxThickness: quotaThickness,
    terminalWidth: 16,
    restPeriods,
    shape: "area"
  });
  const refillTimes = new Set(funnel.refills.filter((refill) => refill.after > 0).map((refill) => refill.at));
  const nodes = points.map((point, index) => ({
    id: `decision:${index}`,
    type: "decision",
    x: axis.xAtHours(point.hours),
    y: centerY,
    atHours: point.hours,
    hidden: point.reasons.length === 1 && point.reasons[0] === "pace-change" && restPeriods.some((phase) => point.hours >= phase.startHours - 1e-6 && point.hours <= phase.endHours + 1e-6)
  }));
  const edges = points.slice(1).map((_, index) => ({
    from: `decision:${index}`,
    to: `decision:${index + 1}`,
    kind: "continue",
    path: `M ${nodes[index].x} ${centerY} H ${nodes[index + 1].x}`
  }));
  const annotations = [];
  const pointIndex = (hours) => points.findIndex((point) => Math.abs(point.hours - hours) < 1e-6);
  const card = (hours, node, kind) => annotations.push({
    ...node,
    anchorX: axis.xAtHours(hours),
    atHours: hours,
    edgeKind: kind,
    width: Math.min(compact ? COMPACT_CARD_WIDTH : node.width ?? 190, plotLabelWidth),
    height: 64,
    from: `decision:${Math.max(0, pointIndex(hours))}`
  });
  const expires = (reset) => t2("{date} 24:00\u5230\u671F\uFF08\u4F30\u7B97\uFF09", { date: reset.expiresOn.slice(5).replace("-", "/") });
  const scenario = result.forecastScenario;
  const bankedCount = result.resets.length;
  const retainedBanks = result.backupChoices.filter((choice) => !choice.used && choice.atHours === null);
  const resetActions = [
    {
      sequence: 1,
      available: !!forecastFocus && scenario?.available,
      hours: scenario?.hours,
      selected: scenario?.selected,
      onNoReset: scenario?.onNoReset
    },
    {
      sequence: 2,
      available: !!forecastFollowing && scenario?.following?.available,
      ...scenario?.following
    }
  ];
  for (const action of resetActions.filter((action2) => action2.available)) card(action.hours, {
    id: action.sequence === 1 ? "forecast-assumption" : `forecast-assumption:${action.sequence}`,
    type: "forecast-assumption",
    sequence: action.sequence,
    selected: action.selected,
    width: 132,
    ...resetAssumptionContent({ ...action, locale })
  }, action.sequence === 1 ? "reset" : "reset-second");
  for (const point of points) {
    const forecast = forecastMilestones.find((item) => Math.abs(item.hours - point.hours) < 1e-6);
    const afterAssumedReset = scenario?.selected && point.hours > scenario.hours + 1e-6;
    const riskLine = forecast && !afterAssumedReset ? t2(result.flexibleSchedule ? "\u672A\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%" : "\u6B64\u65F6\u4ECD\u672A\u989D\u5916\u91CD\u7F6E\uFF1A{percent}%", { percent: round4(forecast.noResetProbability * 100) }) : null;
    const banks = point.events.filter((event) => event.kind === "backup");
    for (const event of banks) {
      const condition = result.backupChoices.find((choice) => choice.index === event.resetIndex)?.usageCondition;
      const bankRisk = condition ? Number.isFinite(condition.probability) ? t2("\u672A\u518D reset\uFF1A{percent}%", { percent: round4(condition.probability * 100) }) : null : riskLine;
      card(point.hours, {
        id: `backup:${event.resetIndex}`,
        type: "backup",
        resetIndex: event.resetIndex,
        title: t2(condition ? "\u82E5\u8017\u5C3D\uFF0C\u7528\u5907\u7528" : "\u4F7F\u7528 1 \u4E2A\u5907\u7528 reset"),
        usageCondition: condition,
        warning: event.deadlineDriven || event.overwrittenPercent > 1e-6,
        lines: [
          time(event.at),
          event.deadlineDriven ? expires(event) : t2("{date}\u5230\u671F", { date: event.expiresOn.slice(5).replace("-", "/") }),
          ...event.overwrittenPercent > 1e-6 ? [t2("\u63D0\u524D\u5151\u6362\u5C06\u8986\u76D6 {percent}%", { percent: round4(event.overwrittenPercent) })] : [],
          ...bankRisk ? [bankRisk] : []
        ],
        lineTones: [
          "",
          event.deadlineDriven ? "danger" : "",
          ...event.overwrittenPercent > 1e-6 ? ["danger"] : [],
          ...bankRisk ? [""] : []
        ]
      }, "backup");
    }
    const bridge = point.events.find((event) => event.kind === "credits-advisory");
    if (bridge) card(point.hours, {
      id: `credits:${point.hours}`,
      type: "credits",
      title: t2(banks.length ? "\u53EF\u9009\uFF1A\u4F7F\u7528 Credits \u8854\u63A5" : "\u989D\u5EA6\u8017\u5C3D \xB7 \u53EF\u7528 Credits \u8854\u63A5"),
      lines: [time(bridge.at), t2("\u6D88\u8017\u9700\u81EA\u5DF1\u9884\u4F30")]
    }, "credits");
    if (point.reasons.includes("depletion") && !bridge && !refillTimes.has(point.at)) card(point.hours, {
      id: `depletion:${point.hours}`,
      type: "depletion",
      title: t2("\u9884\u8BA1\u8017\u5C3D"),
      lines: [time(point.at)]
    }, "depletion");
  }
  for (const point of scenario?.selected ? points : []) if (point !== end && point.events.some((event) => event.kind === "normal-refresh"))
    card(point.hours, {
      id: `normal:${point.hours}`,
      type: "normal",
      title: t2("\u6B63\u5E38\u5237\u65B0"),
      lines: [clock(point.at)]
    }, "normal");
  if (result.milestones.endKind === "normal-refresh") card(end.hours, {
    id: "normal-reset",
    type: "normal",
    title: t2("\u6B63\u5E38\u5237\u65B0"),
    lines: [time(end.at)]
  }, "normal");
  else if (!scenario?.selected) card(end.hours, {
    id: "planning-end",
    type: "horizon",
    title: t2("\u540E\u7EED\u91CD\u65B0\u89C4\u5212"),
    lines: [result.milestones.endKind === "extra-reset" ? t2("\u989D\u5916\u91CD\u7F6E\u540E\u6309\u5B9E\u9645\u4F59\u989D\u91CD\u7B97") : t2("\u6B63\u5E38\u5237\u65B0 {time}", { time: time(result.normalResetAt) })]
  }, "normal");
  const rows = [];
  const annotationHeight = (node) => 32 + (node.lines.length + (node.type === "forecast-assumption" && node.selected ? 1 : 0)) * 16;
  const rowHeight = Math.max(64, ...annotations.map(annotationHeight)) + 19;
  let height = centerY + 90;
  const placeAnnotation = (annotation, x, row) => {
    (rows[row] ??= []).push({ left: x, right: x + annotation.width });
    const node = {
      ...annotation,
      x,
      y: centerY + 70 + row * rowHeight,
      height: annotationHeight(annotation)
    };
    nodes.push(node);
    const middle = node.y + node.height / 2;
    const turn = node.x >= node.anchorX ? 8 : -8;
    edges.push({
      from: node.from,
      to: node.id,
      kind: node.edgeKind,
      path: `M ${node.anchorX} ${centerY} V ${middle - 8} Q ${node.anchorX} ${middle} ${node.anchorX + turn} ${middle} H ${node.x}`
    });
    height = Math.max(height, node.y + node.height + 20);
  };
  const assumptions = annotations.filter((node) => node.type === "forecast-assumption").sort((a, b) => a.sequence - b.sequence);
  if (assumptions.length) {
    const gap = 16, right = axis.width - 4;
    const maxWidth = Math.max(1, (axis.width - 8 - gap * (assumptions.length - 1)) / assumptions.length);
    const cards = assumptions.map((node) => ({ ...node, width: Math.min(node.width, maxWidth) }));
    const totalWidth = cards.reduce((sum, node) => sum + node.width, 0) + gap * (cards.length - 1);
    const left = Math.max(0, Math.min(axis.leftPadding, right - totalWidth));
    let cursor = left;
    const positions = cards.map((node) => {
      const x = Math.max(cursor, Math.min(right - node.width, node.anchorX + 9));
      cursor = x + node.width + gap;
      return x;
    });
    cursor = right;
    for (let index = cards.length - 1; index >= 0; index--) {
      positions[index] = Math.min(positions[index], cursor - cards[index].width);
      cursor = positions[index] - gap;
    }
    cards.forEach((node, index) => placeAnnotation(node, positions[index], 0));
  }
  for (const annotation of annotations.filter((node) => node.type !== "forecast-assumption").sort((a, b) => a.atHours - b.atHours)) {
    const x = clamp3(annotation.anchorX + 9, annotation.width);
    let row = rows.findIndex((ranges) => ranges.every((range) => range.right + 16 <= x || x + annotation.width + 16 <= range.left));
    if (row < 0) row = rows.length;
    placeAnnotation(annotation, x, row);
  }
  const gutterWidth = Math.max(0, axis.leftPadding - 16);
  const resetLaneLabels = [probabilityPlot, followingPlot].map((plot, index) => plot ? {
    id: `reset-${index + 1}`,
    ...compact ? { x: axis.leftPadding, y: plot.topY - 62, width: plotLabelWidth, height: 18 } : { x: 0, y: plot.topY + plot.height / 2 - 10, width: gutterWidth, height: 20 },
    inline: true,
    title: t2(index === 0 ? "Reset \u6982\u7387" : "\u7B2C\u4E8C\u6B21 reset \u6982\u7387"),
    detail: "",
    tooltip: [
      t2(index === 0 ? "\u9996\u6B21\u989D\u5916\u91CD\u7F6E\u9884\u6D4B" : "\u7B2C\u4E8C\u6B21\u989D\u5916\u91CD\u7F6E\u9884\u6D4B"),
      t2("\u6982\u7387\u5BC6\u5EA6"),
      index === 1 ? t2("\u4EE5\u9996\u6B21\u53D1\u751F\u4E3A\u524D\u63D0") : ""
    ].filter(Boolean).join(" \xB7 ")
  } : null);
  const suggested = shownPhases.some((phase) => !phase.fixed && !phase.constrained && phase.reason !== "no-resource" && Math.abs(phase.dailyPercent - phase.baselineDailyPercent) > 1e-5);
  const headings = compact ? [{
    x: axis.leftPadding,
    y: phaseY - 22,
    width: plotLabelWidth,
    height: 18,
    kind: "usage",
    inline: true,
    date: [t2(suggested ? "\u5EFA\u8BAE / \u5929" : "\u7528\u91CF / \u5929"), ...opportunityHeight ? [t2("\u91CD\u7F6E\u6982\u7387 \xB7 \u622A\u81F3")] : []].join(" \xB7 "),
    state: ""
  }] : [
    {
      x: 0,
      y: phaseY,
      width: gutterWidth,
      height: 20,
      kind: "usage",
      inline: true,
      date: t2(gutterWidth < 160 ? suggested ? "\u5EFA\u8BAE / \u5929" : "\u7528\u91CF / \u5929" : suggested ? "\u5EFA\u8BAE\u7528\u91CF / \u5929" : "\u65E5\u5747\u7528\u91CF"),
      state: ""
    },
    ...opportunityHeight ? [{
      x: 0,
      y: phaseY + 36,
      width: gutterWidth,
      height: opportunityHeight,
      kind: "opportunity",
      inline: true,
      date: t2("\u91CD\u7F6E\u6982\u7387 \xB7 \u622A\u81F3"),
      state: "",
      tooltip: t2("\u56FA\u5B9A\u65E5\u671F\u4E4B\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\u7684\u7D2F\u8BA1\u6982\u7387")
    }] : [],
    {
      x: 0,
      y: centerY - quotaThickness / 2 - 10,
      width: gutterWidth,
      height: 20,
      kind: "consumption",
      inline: true,
      date: t2("\u5269\u4F59\u989D\u5EA6"),
      state: ""
    }
  ];
  return {
    compact,
    nodes,
    edges,
    headings,
    controls: [],
    phaseControls,
    bankedCount,
    retainedBanks,
    compactForecast: result.flexibleSchedule,
    width: axis.width,
    height,
    levels: strategyTreeView(result),
    displayLevels: strategyMilestoneView(result),
    funnel,
    locale,
    timeZone: result.timeZone,
    resetLaneLabels,
    forecastCalendar: result.forecastCalendar,
    forecastLayout,
    forecastFocus,
    forecastFollowing,
    forecastPeaks,
    probabilityPlot,
    followingPlot,
    followingPeaks,
    forecastScenario: scenario,
    dayAxis: {
      days: axis.days,
      labels: dateLabels,
      endHours: displayEndHours,
      dayWidth: axis.dayWidth,
      nowX: axis.nowX,
      leftPadding: axis.leftPadding,
      rightPadding: axis.padding,
      centerY,
      quotaTopY: centerY - quotaThickness,
      forecastY: headingY - 8,
      gridTop: 28,
      gridBottom: centerY + 39
    }
  };
}

// src/usage-rate-label.js
var round5 = (value) => Number(value.toFixed(1));
function usageRateAdvice(baselineDailyPercent, dailyPercent, locale = "zh-CN") {
  if (!Number.isFinite(baselineDailyPercent) || baselineDailyPercent <= 0 || !Number.isFinite(dailyPercent) || dailyPercent <= 0) return "";
  if (Math.abs(dailyPercent - baselineDailyPercent) < 1e-5) return "";
  return translator(locale)("\u5EFA\u8BAE {daily}% / \u5929", { daily: round5(dailyPercent) });
}
function usageRateDetail(baselineDailyPercent, dailyPercent, locale = "zh-CN") {
  return translator(locale)("{daily}% / \u5929", { daily: round5(dailyPercent) });
}

// src/components/strategy-annotations.js
var position2 = (node) => `left:${node.viewportWidth ? `${node.x / node.viewportWidth * 100}%` : `${node.x}px`};top:${node.y}px;width:${node.viewportWidth ? `${node.width / node.viewportWidth * 100}%` : `${node.width}px`}`;
var MINIMUM_LABEL_WIDTH = 36;
var COMPACT_MINIMUM_LABEL_WIDTH = 30;
var COMPACT_CHANCE_WIDTH = 46;
function renderPhaseControl(phase, { timeZone: timeZone2, escape: escape3, locale = "zh-CN" }) {
  const t2 = translator(locale);
  const advice = !phase.fixed && !phase.constrained ? usageRateAdvice(phase.baselineDailyPercent, phase.dailyPercent, locale) : "";
  const quotaLabel = phase.quotaLabel && !phase.viewportWidth;
  const value = quotaLabel ? `${Number(phase.dailyPercent.toFixed(1))}%` : advice || usageRateDetail(phase.baselineDailyPercent, phase.dailyPercent, locale);
  const tooNarrow = quotaLabel && Number.isFinite(phase.width) && phase.width < (phase.compact ? COMPACT_MINIMUM_LABEL_WIDTH : MINIMUM_LABEL_WIDTH);
  const label = phase.reason === "no-resource" && !quotaLabel ? `<strong>${t2("\u6682\u505C")}</strong>` : tooNarrow ? '<strong aria-hidden="true"></strong>' : `<strong class="${advice ? "phase-advice" : "phase-budget"}">${escape3(value)}</strong>`;
  const review = phase.stageReason === "if-no-extra-reset-after-48h" ? t2("\u82E5\u4E24\u5929\u540E\u4ECD\u672A\u989D\u5916 reset") : phase.stageReason === "if-no-extra-reset-at-review" ? t2("\u82E5\u4ECD\u672A\u989D\u5916 reset") : "";
  const detail = phase.reason === "no-resource" ? t2("\u6682\u505C") : usageRateDetail(phase.baselineDailyPercent, phase.dailyPercent, locale);
  const labelHeight = phase.labelHeight ?? (phase.nextResetOpportunity ? 36 + resetOpportunityLayout(phase.width).height : 34);
  return `<div class="phase-controls" data-phase-start-at="${escape3(phase.startAt)}" data-phase-daily="${phase.dailyPercent}" data-phase-baseline="${phase.baselineDailyPercent}" ${quotaLabel ? "data-quota-label" : ""} title="${escape3([review, detail].filter(Boolean).join(" \xB7 "))}" style="${position2(phase)}${quotaLabel ? `;--phase-label-height:${labelHeight}px` : ""}">${review && !quotaLabel ? `<small class="review-condition">${review}</small>` : ""}${label}${tooNarrow || phase.compact && phase.width < COMPACT_CHANCE_WIDTH ? "" : renderResetOpportunity(phase.nextResetOpportunity, { timeZone: timeZone2, escape: escape3, locale, compact: quotaLabel, width: phase.width, dateOnly: !!phase.compact })}</div>`;
}
function renderStrategyNode(node, escape3, locale = "zh-CN") {
  const t2 = translator(locale);
  const interactive = node.resetIndex !== void 0 || node.type === "alternative" || node.type === "selected" && node.canChoose;
  const data = node.resetIndex !== void 0 ? `data-backup-choice="${node.resetIndex}" aria-pressed="${!node.held}" title="${t2(node.held ? "\u9009\u62E9\u4F7F\u7528\u8FD9\u4E2A\u5907\u7528 reset\uFF0C\u8054\u52A8\u89C4\u5212\u7528\u91CF" : "\u6539\u4E3A\u4FDD\u7559\u8FD9\u4E2A\u5907\u7528 reset\uFF0C\u91CD\u65B0\u89C4\u5212")}"` : node.type === "selected" && node.canChoose ? `data-inspect-level="${node.level}"` : node.type === "alternative" ? `data-tree-action="${escape3(node.actionId)}" data-level="${node.level}"` : "";
  return `<${interactive ? 'button type="button"' : "div"} class="graph-node graph-${node.type}${node.warning ? " graph-warning" : ""}" data-node-id="${escape3(node.id)}" ${data} ${node.type === "alternative" ? `title="${t2("\u9009\u62E9\u8FD9\u6761\u5206\u652F\uFF0C\u91CD\u65B0\u89C4\u5212\u540E\u7EED")}"` : ""} style="${position2(node)};min-height:${node.height}px">
      <strong>${escape3(node.title)}${node.type === "selected" && node.recommended ? `<em>${t2("\u63A8\u8350")}</em>` : ""}</strong>
      ${node.lines.map((line, index) => `<span${node.lineTones?.[index] === "danger" ? ' class="deadline-warning"' : ""}>${escape3(line)}</span>`).join("")}
    </${interactive ? "button" : "div"}>`;
}

// src/strategy-tree-layout.js
var STAGE = 405;
var MID = 216;
var round6 = (value) => Number(value.toFixed(1));
function layoutStrategyTree(result, { expandedLevel = 0, showAll = false, prediction = null, viewportWidth, displayEndHours, locale = "zh-CN" } = {}) {
  if (result.paceChoices) return layoutTimeStrategy(result, { prediction, viewportWidth, displayEndHours, locale });
  const levels = strategyTreeView(result);
  const displayLevels = strategyMilestoneView(result);
  const time = (value) => new Intl.DateTimeFormat("zh-CN", {
    timeZone: result.timeZone,
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const nodes = [], edges = [], headings = [], controls = [];
  const link = (from, to, kind, label = "") => edges.push({ from, to, kind, label });
  let height = 300;
  const actionNode = (item, level, x, y, selected) => {
    const direction = item.action.multiplier === 0 ? "\u6682\u505C" : item.action.multiplier < result.startingPoint.multiplier - 1e-6 ? "\u5C11\u7528" : item.action.multiplier > result.startingPoint.multiplier + 1e-6 ? "\u591A\u7528" : "\u6309\u8D77\u70B9\u7528";
    const usedPercent = round6(item.outcome.usedDays * result.averagePercentPerDay);
    const title = item.action.id.startsWith("use-before-") ? `\u5148\u7528\u5B8C\u5F53\u524D ${round6(level.state.quota)}% \u989D\u5EA6` : `${direction}${item.action.multiplier ? ` \xB7 \u65E5\u5747\u7EA6 ${item.dailyPercent}% \u989D\u5EA6` : ""}`;
    const lines = [
      item.action.id.startsWith("use-before-") ? `${level.until}\u524D\u5B8C\u6210 \xB7 \u5269 ${round6(item.outcome.remainingAfter)}%` : `\u8FD9\u6BB5\u7528\u7EA6 ${usedPercent}% \xB7 \u5269 ${round6(item.outcome.remainingAfter)}%`,
      selected ? item.outcome.pauseHours > 1e-6 ? `\u8FD9\u6BB5\u9700\u505C\u7528 ${round6(item.outcome.pauseHours)} \u5C0F\u65F6` : `\u5907\u7528 ${item.outcome.resetsRemaining} \xB7 Credits ${round6(item.outcome.creditsRemaining)}` : item.fallbackText
    ];
    if (selected && item.outcome.pauseHours < 1e-6) lines[1] = level.endDescription;
    if (selected && result.paceChoices) {
      lines.splice(0, lines.length, level.endDescription);
    }
    return {
      id: `${level.index}:${item.id}`,
      type: selected ? "selected" : "alternative",
      x,
      y,
      width: 254,
      height: 66,
      title: selected && result.paceChoices ? item.action.multiplier ? `\u65E5\u5747\u7EA6\u7528 ${item.dailyPercent}%` : "\u6682\u505C\u4F7F\u7528" : title,
      lines,
      actionId: item.id,
      level: level.sourceLevelIndex,
      canChoose: level.canChoose && level.actions.length > 1,
      recommended: item.recommended,
      events: item.events
    };
  };
  for (const level of displayLevels) {
    const x = level.index * STAGE;
    const decision = { id: `decision:${level.index}`, type: "decision", x: x + 16, y: MID };
    const action = actionNode(level.selected, level, x + 45, MID - 92, true);
    const chance = { id: `chance:${level.index}`, type: "chance", x: x + STAGE + 16, y: MID };
    nodes.push(decision, action, chance);
    headings.push({
      x: x + 45,
      y: 80,
      date: level.date,
      state: `\u989D\u5EA6 ${round6(level.state.quota)}% \xB7 \u5907\u7528 ${level.state.resets}`,
      until: level.until
    });
    link(decision.id, action.id, "selected");
    link(action.id, chance.id, "selected");
    if (!result.forecastCalendar && level.cumulativeResetProbability > 1e-8) {
      const reset = {
        id: `reset:${level.index}`,
        type: "reset",
        x: chance.x - 85,
        y: 9,
        width: 170,
        height: 64,
        title: `\u6B64\u524D\u989D\u5916\u91CD\u7F6E\u6982\u7387 ${round6(level.cumulativeResetProbability * 100)}%`,
        probabilityKind: "cumulative-from-plan-start",
        probability: level.cumulativeResetProbability,
        lines: [level.until, "\u4ECE\u73B0\u5728\u7D2F\u8BA1\uFF1B\u53D1\u751F\u5C31\u91CD\u7B97"]
      };
      nodes.push(reset);
      link(chance.id, reset.id, "reset");
    }
    const last = level.index === displayLevels.length - 1;
    if (!last || result.milestones.endKind === "normal-refresh") {
      const label = result.predictionEnabled ? "\u4ECD\u672A\u91CD\u7F6E" : "\u7EE7\u7EED";
      if (!last) link(chance.id, `decision:${level.index + 1}`, "continue", label);
      else {
        const terminal = {
          id: "normal-reset",
          type: "normal",
          x: x + 430,
          y: MID - 92,
          width: 195,
          height: 66,
          title: "\u6B63\u5E38\u5237\u65B0",
          lines: [level.until]
        };
        nodes.push(terminal);
        link(chance.id, terminal.id, "continue", label);
      }
    }
    if (last && result.milestones.endKind === "planning-horizon") {
      const terminal = {
        id: "planning-end",
        type: "horizon",
        x: x + 430,
        y: MID - 92,
        width: 195,
        height: 66,
        title: "\u540E\u7EED\u91CD\u65B0\u89C4\u5212",
        lines: [`\u6B63\u5E38\u5237\u65B0 ${time(result.normalResetAt)}`]
      };
      nodes.push(terminal);
      link(chance.id, terminal.id, "continue");
    }
    let resourceCount = 0;
    for (const event of level.selected.outcome.events.filter((event2) => event2.kind === "backup")) {
      const backup = {
        id: `backup:${level.index}:${resourceCount}`,
        type: "backup",
        x: x + 45,
        y: 307 + resourceCount * 83,
        width: 190,
        height: 64,
        title: "\u4F7F\u7528 1 \u4E2A\u5907\u7528 reset",
        resetIndex: result.paceChoices ? event.resetIndex : void 0,
        lines: [
          time(event.at),
          `${event.expiresOn.slice(5).replace("-", "/")}\u5230\u671F`,
          ...event.overwrittenPercent > 1e-6 ? [`\u63D0\u524D\u5151\u6362\u5C06\u8986\u76D6 ${round6(event.overwrittenPercent)}%`] : []
        ]
      };
      nodes.push(backup);
      link(decision.id, backup.id, "backup");
      edges.at(-1).lane = resourceCount++;
      height = Math.max(height, backup.y + backup.height + 24);
    }
    if (level.creditsBridge) {
      const bridge = level.creditsBridge;
      const credits = {
        id: `credits:${level.index}`,
        type: "credits",
        x: x + 45,
        y: 307 + resourceCount * 83,
        width: 190,
        height: 64,
        title: "\u53EF\u9009\uFF1A\u4F7F\u7528 Credits \u8854\u63A5",
        lines: [time(bridge.at), "\u6D88\u8017\u9700\u81EA\u5DF1\u9884\u4F30"]
      };
      nodes.push(credits);
      link(decision.id, credits.id, "credits");
      edges.at(-1).lane = resourceCount++;
      height = Math.max(height, credits.y + credits.height + 24);
    }
    const expanded = expandedLevel === level.sourceLevelIndex;
    if (!level.canChoose || level.actions.length < 2) continue;
    controls.push({ level: level.sourceLevelIndex, x: x + 45, y: 271, expanded, kind: "compare" });
    if (!expanded) continue;
    const alternatives = level.actions.filter((item) => item.id !== level.selectedActionId);
    const priority = [];
    for (const category of ["bank-now", "credits", "deadline", "hold", "pause"]) {
      const item = alternatives.find((item2) => item2.category === category && !priority.includes(item2));
      if (item) priority.push(item);
    }
    for (const item of alternatives) if (!priority.includes(item)) priority.push(item);
    const shown = showAll ? priority : priority.slice(0, 3);
    const alternativesTop = 307 + resourceCount * 83;
    shown.forEach((item, index) => {
      const alternative = actionNode(
        item,
        { ...level, until: levels[level.sourceLevelIndex].until },
        x + 45,
        alternativesTop + index * 83,
        false
      );
      nodes.push(alternative);
      link(decision.id, alternative.id, "alternative");
      height = Math.max(height, alternative.y + alternative.height + 24);
    });
    if (shown.length < alternatives.length) {
      const y = alternativesTop + shown.length * 83;
      controls.push({
        level: level.sourceLevelIndex,
        x: x + 45,
        y,
        kind: "more",
        count: alternatives.length - shown.length
      });
      height = Math.max(height, y + 38);
    }
  }
  const offsetY = nodes.some((node) => node.type === "reset") ? 0 : -70;
  const funnel = quotaFunnelGeometry(result.milestones, {
    startX: 16,
    stageWidth: STAGE,
    centerY: MID + offsetY
  });
  if (offsetY) {
    for (const node of nodes) node.y -= 70;
    for (const heading of headings) heading.y -= 70;
    for (const control of controls) control.y -= 70;
    height -= 70;
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to) throw new Error("\u7B56\u7565\u6811\u8FDE\u63A5\u7F3A\u5C11\u7AEF\u70B9");
    const start = {
      x: from.x + (from.width ?? 0),
      y: from.type === "selected" ? MID + offsetY : from.y + (from.height ?? 0) / 2
    };
    const end = {
      x: to.x,
      y: ["selected", "normal"].includes(to.type) ? MID + offsetY : to.y + (to.height ?? 0) / 2
    };
    if (edge.kind === "reset") {
      end.x += to.width / 2;
      end.y = to.y + to.height;
      edge.path = `M ${start.x} ${start.y} V ${end.y}`;
    } else if (edge.kind === "backup" || edge.kind === "credits") {
      const laneX = start.x - edge.lane * 6;
      edge.path = `M ${start.x} ${start.y} H ${laneX} V ${end.y - 9} Q ${laneX} ${end.y} ${laneX + 9} ${end.y} H ${end.x}`;
    } else if (edge.kind === "alternative") {
      edge.path = `M ${start.x} ${start.y} V ${end.y - 9} Q ${start.x} ${end.y} ${start.x + 9} ${end.y} H ${end.x}`;
    } else edge.path = `M ${start.x} ${start.y} H ${end.x}`;
    edge.labelX = (start.x + end.x) / 2;
    edge.labelY = start.y - 10;
  }
  return {
    nodes,
    edges,
    headings,
    controls,
    width: displayLevels.length * STAGE + 240,
    height,
    levels,
    displayLevels,
    funnel,
    forecastCalendar: result.forecastCalendar,
    timeZone: result.timeZone,
    bankedCount: result.resets?.length ?? 0
  };
}
function renderStrategyTree(graph, escape3) {
  const locale = graph.locale ?? "zh-CN", t2 = translator(locale);
  const resetActionIds = new Set(graph.nodes.filter((node) => node.type === "forecast-assumption").map((node) => node.id));
  const shownQuotaLabels = /* @__PURE__ */ new Set();
  let lastRight = -Infinity;
  for (const label of graph.funnel.bands.flatMap((band) => band.labels.filter((label2, index) => !graph.dayAxis || index === 0 || band.x2 - band.x1 >= 70).map((label2) => ({ label: label2, width: `${round6(label2.quota)}%`.length * 7 + 4 }))).sort((a, b) => (a.label.anchor === "end" ? a.label.x - a.width : a.label.x) - (b.label.anchor === "end" ? b.label.x - b.width : b.label.x))) {
    const left = label.label.anchor === "end" ? label.label.x - label.width : label.label.x;
    if (left < lastRight + 4) continue;
    shownQuotaLabels.add(label.label);
    lastRight = left + label.width;
  }
  const resetElements = [
    { sequence: 1, plot: graph.probabilityPlot, focus: graph.forecastFocus, peaks: graph.forecastPeaks ?? [] },
    { sequence: 2, plot: graph.followingPlot, focus: graph.forecastFollowing, peaks: graph.followingPeaks ?? [] }
  ].map((props) => ({
    ...props,
    action: graph.nodes.find((node) => node.type === "forecast-assumption" && (node.sequence ?? 1) === props.sequence),
    refills: graph.funnel.refills.filter((refill) => refill.kind === "assumed-extra" && (refill.sequence ?? 1) === props.sequence)
  })).filter((props) => props.plot || props.focus || props.action || props.refills.length).map((props) => renderResetElement({
    ...props,
    connectors: graph.edges.filter((edge) => edge.to === props.action?.id),
    guideEndY: graph.dayAxis?.quotaTopY !== void 0 ? graph.dayAxis.quotaTopY - 8 : graph.dayAxis?.centerY - 32,
    timeZone: graph.timeZone,
    locale,
    laneLabel: graph.resetLaneLabels?.[props.sequence - 1]
  }, escape3));
  const svg = `<svg class="tree-edges" width="${graph.width}" height="${graph.height}" aria-hidden="true">
    <defs><linearGradient id="quota-fill" x1="0" y1="0" x2="0" y2="1"><stop class="quota-fill-start" offset="0%"/><stop class="quota-fill-end" offset="100%"/></linearGradient></defs>
    ${graph.dayAxis ? graph.dayAxis.days.filter((_, index) => index % 2).map((day) => `<rect class="time-day-band" x="${day.x}" y="${graph.dayAxis.gridTop}" width="${graph.dayAxis.dayWidth}" height="${graph.dayAxis.gridBottom - graph.dayAxis.gridTop}"/>`).join("") : ""}
    ${graph.dayAxis ? [...graph.dayAxis.days.map((day) => day.x), graph.dayAxis.days.at(-1).x + graph.dayAxis.dayWidth].map((x) => `<path class="time-grid-line" d="M ${x} ${graph.dayAxis.gridTop} V ${graph.dayAxis.gridBottom}"/>`).join("") : ""}
    ${resetElements.map((element) => element.svg).join("")}
    ${!graph.compactForecast && graph.forecastLayout?.length ? `<path class="time-forecast-line" d="M ${graph.forecastLayout[0].x} ${graph.dayAxis.forecastY} H ${graph.forecastLayout.at(-1).x}"/>${graph.forecastLayout.map((point) => `<circle class="time-forecast-point" cx="${point.x}" cy="${graph.dayAxis.forecastY}" r="2.5"/>`).join("")}` : ""}
    ${graph.funnel.bands.map((band) => `<g class="quota-phase${band.kind === "assumed-refresh" ? " quota-phase-assumed" : ""}"${band.kind === "rest" ? " data-quota-rest" : ""} data-start-quota="${band.startQuota}" data-end-quota="${band.endQuota}">
      <path class="quota-baseline${band.kind === "pause" ? " quota-paused-line" : band.kind === "rest" ? " quota-rest-line" : ""}" d="${band.baseline}"/>
      ${band.kind === "rest" ? "" : `<path class="quota-band quota-${band.kind}" d="${band.path}"/>`}
      ${band.labels.filter((label) => shownQuotaLabels.has(label)).map((label) => `<text class="quota-label" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${round6(label.quota)}%</text>`).join("")}
    </g>`).join("")}
    ${graph.edges.filter((edge) => !["selected", "continue"].includes(edge.kind) && !resetActionIds.has(edge.to)).map((edge) => `<path class="edge-${edge.kind}" d="${edge.path}"/>`).join("")}
    ${graph.funnel.refills.filter((refill) => refill.kind !== "assumed-extra").map((refill) => `<path class="quota-refill quota-refill-${refill.kind}" data-refill-sequence="${refill.sequence ?? 0}" d="${refill.path}"/>`).join("")}
    ${resetElements.map((element) => element.overlaySvg).join("")}
    ${graph.nodes.filter((node) => !node.hidden && ["decision", "chance"].includes(node.type)).map((node) => `<circle class="point-${node.type}" cx="${node.x}" cy="${node.y}" r="${node.type === "decision" ? 4 : 3}"/>`).join("")}
  </svg>`;
  const headings = graph.headings.map((item) => ["consumption", "usage", "opportunity"].includes(item.kind) ? renderTimelineLaneLabel({ ...item, id: item.kind, title: item.date, detail: item.state, note: item.unit }, escape3) : `<div class="graph-day" style="left:${item.x}px;top:${item.y}px;width:${item.width ?? 254}px"><strong>${escape3(item.date)}</strong>${item.state ? `<span>${escape3(item.state)}</span>` : ""}</div>`).join("");
  const days = graph.dayAxis ? (graph.dayAxis.labels ?? graph.dayAxis.days).map((day) => `<div class="time-day" style="left:${day.x}px;width:${day.width}px">${escape3(uiLocale(locale) === "zh-CN" ? day.label : new Intl.DateTimeFormat(uiLocale(locale), { timeZone: graph.timeZone, month: "short", day: "numeric" }).format(new Date(Date.parse(day.startAt) + 36e5)))}</div>`).join("") : "";
  const alignedForecast = graph.forecastLayout?.length ? `<div class="forecast-calendar forecast-aligned" aria-label="${t2("\u56FA\u5B9A\u65E5\u671F\u4E4B\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\u7684\u7D2F\u8BA1\u6982\u7387")}">${graph.forecastLayout.map((point) => `<span ${point.calendar ? "data-forecast-at" : "data-event-forecast-at"}="${escape3(point.at)}" data-probability="${point.probability}" title="${escape3(t2("\u622A\u81F3 {time} \u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916 reset", { time: point.at }))}" style="left:${point.left}px;top:${point.y}px;width:${point.width}px">${graph.probabilityPlot ? "" : `<small>${escape3(point.label)}</small>`}<strong>${graph.probabilityPlot ? t2("\u7D2F\u8BA1") + " " : graph.compactForecast ? t2("\u989D\u5916\u91CD\u7F6E") + " " : ""}${round6(point.probability * 100)}%</strong></span>`).join("")}</div>` : "";
  const nodes = graph.nodes.filter((node) => node.width && node.type !== "forecast-assumption").map((node) => renderStrategyNode(node, escape3, locale)).join("");
  const controls = graph.controls.map((control) => `<button type="button" class="graph-control" ${control.kind === "compare" ? `data-inspect-level="${control.level}" aria-expanded="${control.expanded}"` : "data-show-all-actions"} style="left:${control.x}px;top:${control.y}px">${control.kind === "compare" ? t2(control.expanded ? "\u2212 \u6536\u8D77\u5176\u4ED6\u505A\u6CD5" : "\uFF0B \u6BD4\u8F83\u8FD9\u4E00\u6B65") : t2("\uFF0B \u5176\u4ED6 {count} \u79CD\u505A\u6CD5", { count: control.count })}</button>`).join("");
  const phaseControls = (graph.phaseControls ?? []).map((phase) => renderPhaseControl(phase, {
    firstPhaseIndex: graph.phaseControls[0]?.phaseIndex,
    scenarioSelected: graph.forecastScenario?.selected,
    timeZone: graph.timeZone,
    escape: escape3,
    locale
  })).join("");
  const forecastDate = (value) => {
    const instant = new Date(value);
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: graph.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(instant);
    if (clock === "00:00") return `${new Intl.DateTimeFormat("zh-CN", {
      timeZone: graph.timeZone,
      month: "numeric",
      day: "numeric"
    }).format(new Date(instant.getTime() - 1))}\u7ED3\u675F`;
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: graph.timeZone,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(instant);
  };
  const forecast = !graph.dayAxis && graph.forecastCalendar?.length ? `<div class="forecast-calendar" aria-label="${t2("\u56FA\u5B9A\u65E5\u671F\u4E4B\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916\u91CD\u7F6E\u7684\u7D2F\u8BA1\u6982\u7387")}">
    <span>\u6B64\u524D\u989D\u5916\u91CD\u7F6E\u6982\u7387</span><div>${graph.forecastCalendar.map((point) => `<span><small>${escape3(forecastDate(point.at))}</small><strong>${round6(point.probability * 100)}%</strong></span>`).join("")}</div></div>` : "";
  const forecastLegend = !graph.compactForecast && graph.forecastLayout?.length ? `<div class="forecast-legend">${t2("\u84DD\u7EBF\uFF1A\u6B64\u524D\u81F3\u5C11\u53D1\u751F\u4E00\u6B21\u989D\u5916 reset \u7684\u6982\u7387")}</div>` : "";
  const inventory = graph.bankedCount > 0 ? `<div class="retained-resets" data-banked-count="${graph.bankedCount}">${escape3(t2("\u5907\u7528 reset \xB7 {count} \u4E2A", { count: graph.bankedCount }))}</div>` : "";
  return `${forecast}${forecastLegend}<div class="tree-scroll" data-timeline-orientation="horizontal" tabindex="0" role="region" aria-label="${t2("\u4ECE\u5DE6\u5411\u53F3\u7684\u989D\u5EA6\u6F0F\u6597\u4E0E\u7B56\u7565\u9009\u62E9\uFF0C\u53EF\u6A2A\u5411\u6EDA\u52A8")}"><div class="strategy-graph"${graph.compact ? " data-compact" : ""} style="width:${graph.width}px;height:${graph.height}px" ${graph.dayAxis ? `data-timeline-from="${graph.dayAxis.days[0].startAt}" data-timeline-to="${graph.dayAxis.days.at(-1).endAt}"` : ""}>${svg}${days}${alignedForecast}${resetElements.map((element) => element.html).join("")}${headings}${phaseControls}${nodes}${controls}</div></div>${inventory}`;
}

// src/workspace-layout.js
function workspaceLayout(availableWidth = 1120) {
  const width = Number.isFinite(availableWidth) && availableWidth > 0 ? Math.round(availableWidth) : 1120;
  const panelPadding = width < 680 ? 14 : 24;
  return { width, panelPadding, timelineWidth: Math.max(1, width - panelPadding * 2 - 2) };
}

// src/page-metadata.js
var PLANNER_METADATA = {
  en: {
    title: "Codex4ever | Codex Quota & Reset Planner",
    description: "Plan OpenAI Codex usage with quota depletion estimates, banked reset deadlines and extra reset forecasts. Compare daily usage strategies locally or through MCP.",
    intro: "Plan Codex quota, banked resets and extra reset forecasts, right in your browser.",
    locale: "en_GB"
  },
  "zh-CN": {
    title: "Codex4ever | Codex \u989D\u5EA6\u4E0E Reset \u7528\u91CF\u89C4\u5212",
    description: "\u6839\u636E Codex \u5269\u4F59\u989D\u5EA6\u3001\u6D88\u8017\u901F\u5EA6\u3001\u5907\u7528 reset \u5230\u671F\u65F6\u95F4\u548C\u989D\u5916\u91CD\u7F6E\u9884\u6D4B\uFF0C\u6BD4\u8F83\u65E5\u5747\u7528\u91CF\u7B56\u7565\u4E0E\u9884\u8BA1\u8017\u5C3D\u65F6\u95F4\u3002\u652F\u6301\u672C\u5730\u8FD0\u884C\u548C MCP \u63A5\u5165\u3002",
    intro: "\u89C4\u5212 Codex \u7528\u91CF\u3001\u5907\u7528 reset \u4E0E\u989D\u5916\u91CD\u7F6E\uFF0C\u5168\u90E8\u5728\u6D4F\u89C8\u5668\u91CC\u8BA1\u7B97\u3002",
    locale: "zh_CN"
  }
};
function syncPlannerMetadata(document2, language2) {
  const meta = PLANNER_METADATA[language2] ?? PLANNER_METADATA.en;
  document2.title = meta.title;
  for (const [selector, value] of [
    ['meta[name="description"]', meta.description],
    ['meta[property="og:title"]', meta.title],
    ['meta[property="og:description"]', meta.description],
    ['meta[property="og:locale"]', meta.locale],
    ['meta[name="twitter:title"]', meta.title],
    ['meta[name="twitter:description"]', meta.description]
  ]) document2.querySelector(selector)?.setAttribute?.("content", value);
  return meta;
}

// src/plugin-page-client.js
function pluginPageClient(location = globalThis.location, fetcher = globalThis.fetch) {
  const token = new URLSearchParams(location?.hash?.slice(1) ?? "").get("planner");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const request = async (path, method = "GET", preferences) => {
    const response = await fetcher(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...preferences ? { "Content-Type": "application/json" } : {}
      },
      ...preferences ? { body: JSON.stringify(preferences) } : {}
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Local planner is unavailable");
    return data;
  };
  return {
    read: (revision) => request(`/api/session${Number.isInteger(revision) ? `?after=${revision}` : ""}`),
    refresh: (preferences) => request("/api/refresh", "POST", preferences)
  };
}

// src/web.js
var $ = (selector) => document.querySelector(selector);
var escape2 = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
var STORAGE_KEY = "codex4ever-intensity-v1";
var savedLanguage;
try {
  savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
} catch {
}
var language = chooseLanguage({
  saved: savedLanguage,
  browserLanguages: typeof navigator === "undefined" ? [] : navigator.languages,
  browserLanguage: typeof navigator === "undefined" ? void 0 : navigator.language
});
var t = (source, values) => translate(language, source, values);
var statusMessage = null;
var lastError = null;
var setStatus = (message) => {
  statusMessage = message;
  $("#status").textContent = t(message);
};
function renderStaticLanguage() {
  const metadata = syncPlannerMetadata(document, language);
  document.documentElement?.setAttribute("lang", language);
  $(".brand p").textContent = metadata.intro;
  for (const [selector, label] of [
    [".affiliation-notice", "OpenAI Codex \u7684\u975E\u5B98\u65B9\u53EF\u89C6\u5316\u7528\u91CF\u89C4\u5212\u5DE5\u5177\u3002\u4E0E OpenAI \u65E0\u96B6\u5C5E\u5173\u7CFB\u3002"],
    ["#github-star", "\u2605 \u5728 GitHub \u70B9\u4E2A Star"],
    ["#follow-x", "\u5728 X \u5173\u6CE8\u6211"],
    ["#calculate", "\u66F4\u65B0\u6570\u636E"],
    ["#source-code", "GitHub \u5F00\u6E90"],
    ["#creator-contact", "\u5982\u679C\u4F60\u559C\u6B22\u8FD9\u4E2A\u4F5C\u54C1\uFF0C\u6B22\u8FCE\u5728 X \u4E0A\u5173\u6CE8\u6211"],
    ["[data-credit-label]", "\u91CD\u7F6E\u6570\u636E\u6765\u6E90"]
  ]) {
    const element = $(selector);
    if (element) element.textContent = t(label);
  }
  $("#calculate").setAttribute?.("title", t("\u91C7\u7528\u8F93\u5165\u4FEE\u6539\u5E76\u5237\u65B0\u91CD\u7F6E\u8BC1\u636E"));
  $("#planner-guide").textContent = language === "zh-CN" ? "\u4F7F\u7528\u8BF4\u660E" : "How it works";
  $("#planner-guide").setAttribute?.("href", language === "zh-CN" ? "/zh/guide/" : "/guide/");
  for (const [selector, label] of [[".controls-panel", "\u72B6\u6001\u4E0E\u9884\u6D4B"], ["#inputs", "\u7B97\u6CD5\u8F93\u5165"], ["#forecast", "\u9884\u6D4B\u4F9D\u636E"], ["#output", "\u7B97\u6CD5\u8F93\u51FA"]])
    $(selector).setAttribute?.("aria-label", t(label));
  $("#language-switch").setAttribute?.("aria-label", t("\u8BED\u8A00"));
  $("#language-switch").innerHTML = [["en", "English"], ["zh-CN", "\u4E2D\u6587"]].map(([value, label]) => `<button type="button" data-language="${value}" lang="${value}" aria-pressed="${language === value}">${label}</button>`).join("");
  if (statusMessage) $("#status").textContent = t(statusMessage);
  if (lastError) $("#error").textContent = diagnosticText(language, lastError, "input");
}
var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
var plugin = pluginPageClient();
var pluginRevision = null;
var manualDraft = false;
var localDate = (date) => new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(date);
var today = localDate(/* @__PURE__ */ new Date());
var input = {
  weeklyRemaining: 40,
  weeklyResetDays: 4,
  weeklyResetHours: 0,
  resetDates: []
};
var renderedWidth = 0;
var forecastSource = { available: false, reason: "\u9884\u6D4B\u6570\u636E\u6682\u4E0D\u53EF\u7528" };
var calculationRun = 0;
var visibleMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1);
var calendarOpen = false;
var savedPlannerPreferences;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("pace-simple-input-v4"));
  if (saved) {
    for (const key of Object.keys(input)) if (key in saved) input[key] = saved[key];
  }
  savedPlannerPreferences = saved;
} catch {
}
input.weeklyRemaining = Number(input.weeklyRemaining);
input.weeklyResetDays = Number(input.weeklyResetDays);
input.weeklyResetHours = Number(input.weeklyResetHours);
if (!Number.isInteger(input.weeklyResetDays) || input.weeklyResetDays < 0 || input.weeklyResetDays > 7) input.weeklyResetDays = 2;
if (!Number.isInteger(input.weeklyResetHours) || input.weeklyResetHours < 0 || input.weeklyResetHours > 23) input.weeklyResetHours = 0;
if (input.weeklyResetDays * 24 + input.weeklyResetHours > 168) input.weeklyResetHours = 0;
input.resetDates = [...new Set((Array.isArray(input.resetDates) ? input.resetDates : []).filter((date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today))].slice(0, 8);
var planner = createUsagePlannerState({
  timeZone,
  forecastEnabled: savedPlannerPreferences?.forecastEnabled,
  usageStrategy: savedPlannerPreferences?.usageStrategy,
  availabilityMode: savedPlannerPreferences?.availabilityMode,
  alertsEnabled: savedPlannerPreferences?.alertsEnabled
});
var monthIndex = (date) => date.getFullYear() * 12 + date.getMonth();
var monthDistance = () => monthIndex(visibleMonth) - monthIndex(/* @__PURE__ */ new Date());
function calendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const first = new Date(year, month, 1);
  const monthLabel = new Intl.DateTimeFormat(uiLocale(language), { year: "numeric", month: "long" }).format(first);
  const blanks = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const maxDate = localDate(new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), (/* @__PURE__ */ new Date()).getDate() + 365));
  const dates = Array.from({ length: blanks }, () => '<span class="empty-day"></span>');
  for (let day = 1; day <= count; day++) {
    const date = localDate(new Date(year, month, day));
    const backup = input.resetDates.includes(date);
    const disabled = date < today || date > maxDate;
    dates.push(`<button type="button" data-calendar-date="${date}" aria-label="${date}${backup ? t("\uFF0C\u5907\u7528 reset \u5230\u671F\u65E5") : ""}" aria-pressed="${backup}" ${disabled ? "disabled" : ""}>${day}</button>`);
  }
  return `<div class="reset-actions"><div class="calendar-summary">${input.resetDates.length ? input.resetDates.slice().sort().map((date) => `<button type="button" data-remove-date="${escape2(date)}" aria-label="${escape2(t("\u79FB\u9664\u5907\u7528 reset {date}", { date }))}">${escape2(date)} \xD7</button>`).join("") : ""}</div>
    <button type="button" data-toggle-calendar aria-expanded="${calendarOpen}" aria-controls="reset-calendar">${t(calendarOpen ? "\u6536\u8D77\u65E5\u5386" : "\uFF0B \u6DFB\u52A0\u65E5\u671F")}</button></div>
  ${calendarOpen ? `<div class="calendar-panel" id="reset-calendar">
    <div class="calendar-head"><strong>${monthLabel}</strong><div><button type="button" data-month-nav="-1" aria-label="${t("\u4E0A\u4E2A\u6708")}" ${monthDistance() <= 0 ? "disabled" : ""}>\u2039</button><button type="button" data-month-nav="1" aria-label="${t("\u4E0B\u4E2A\u6708")}" ${monthDistance() >= 11 ? "disabled" : ""}>\u203A</button></div></div>
    <div class="month-grid" role="group" aria-label="${t("{month}\u5907\u7528 reset \u5230\u671F\u65E5\u5386", { month: monthLabel })}">${(uiLocale(language) === "zh-CN" ? ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"] : ["M", "T", "W", "T", "F", "S", "S"]).map((day) => `<span class="weekday">${day}</span>`).join("")}${dates.join("")}</div>
    <p class="hint">${t("\u70B9\u65E5\u671F\u6DFB\u52A0\u6216\u53D6\u6D88\uFF1B\u540C\u4E00\u5929\u6700\u591A\u4E00\u4E2A\uFF0C\u5230\u671F\u6309\u5F53\u5929\u7ED3\u675F\u4F30\u7B97\u3002")}</p>
  </div>` : ""}`;
}
function delayControl(field, label, unit, max) {
  return `<div class="delay-control"><button type="button" data-delay-step="${field}" data-delta="-1" aria-label="${t("\u51CF\u5C11{label}", { label: t(label) })}">\u2212</button><input type="number" data-field="${field}" aria-label="${t(label)}" min="0" max="${max}" step="1" value="${escape2(input[field])}"><span>${t(unit)}</span><button type="button" data-delay-step="${field}" data-delta="1" aria-label="${t("\u589E\u52A0{label}", { label: t(label) })}">\uFF0B</button></div>`;
}
function renderInputs() {
  $("#inputs").innerHTML = `<div class="compact-form">
    <fieldset class="calendar-field"><legend>${t("\u5907\u7528 reset \xB7 {count} \u4E2A", { count: input.resetDates.length })}</legend>${calendar()}</fieldset>
    <fieldset class="simple-fields"><legend>${t("\u5F53\u524D\u72B6\u6001")}</legend>
      <label for="weekly-remaining">${t("\u672C\u5468\u989D\u5EA6\u8FD8\u5269\u591A\u5C11 %")}</label><input id="weekly-remaining" data-field="weeklyRemaining" type="number" min="0" max="100" step="any" value="${escape2(input.weeklyRemaining)}">
      <div class="refresh-row"><div class="refresh-label">${t("\u6B63\u5E38\u5237\u65B0\u8FD8\u6709")}</div><div class="delay-controls">${delayControl("weeklyResetDays", "\u6B63\u5E38\u5237\u65B0\u5269\u4F59\u5929\u6570", "\u5929", 7)}${delayControl("weeklyResetHours", "\u6B63\u5E38\u5237\u65B0\u5269\u4F59\u5C0F\u65F6", "\u5C0F\u65F6", 23)}</div></div>
    </fieldset>
  </div>`;
}
function markChanged() {
  manualDraft = true;
  calculationRun++;
  setStatus("\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u66F4\u65B0\u6570\u636E");
  $("#result").classList.add("stale");
  planner = updateUsagePlanner(planner, { type: "invalidate" });
  renderStrategyControls();
}
function renderStrategyControls() {
  $("#strategy-controls").innerHTML = `<div class="control-heading"><h3 id="strategy-controls-title">${t("\u7528\u91CF\u7B56\u7565")}</h3><span class="instant-label">${t("\u5373\u65F6\u66F4\u65B0")}</span></div>${renderUsageStrategies({
    selected: planner.intent.usageStrategy,
    locale: language,
    disabled: !planner.result?.available,
    // Cautious / optimistic belong to keep available: show them right under it.
    after: planner.intent.usageStrategy === "keep-available" ? { "keep-available": renderAvailabilityControls(
      planner.result?.recommendation?.availability ? { ...planner.result.recommendation.availability, timeZone } : null,
      { locale: language, mode: planner.intent.availabilityMode, alertsEnabled: planner.intent.alertsEnabled, disabled: !planner.result?.available },
      escape2
    ) } : {}
  }, escape2)}`;
}
function saveInput() {
  if (plugin && !manualDraft) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...input,
      forecastEnabled: planner.intent.forecastEnabled,
      usageStrategy: planner.intent.usageStrategy,
      availabilityMode: planner.intent.availabilityMode,
      alertsEnabled: planner.intent.alertsEnabled
    }));
  } catch {
  }
}
var round7 = (value) => Number(value.toFixed(1));
var MOBILE_TIMELINE_WIDTH = 640;
var BRAND_STAMP = '<div class="brand-stamp" aria-hidden="true"><span>\u221E</span> Codex4ever</div>';
function renderResult(availableWidth = $("#result").clientWidth) {
  const result = planner.result;
  if (!result) return;
  const planningPrediction = activePlannerPrediction(planner), planningNow = new Date(planner.snapshot.now);
  $("#result").classList.remove("stale");
  const workspace = workspaceLayout(availableWidth);
  renderedWidth = workspace.width;
  const forecastSummary = renderResetForecastSummary({
    source: forecastSource,
    prediction: planningPrediction,
    timeZone,
    now: planningNow,
    locale: language
  });
  $("#forecast").innerHTML = `<div class="forecast-control" ${planningPrediction ? `data-forecast-48-probability="${planningPrediction.next48Probability}"` : ""}><span>${t("\u989D\u5916\u91CD\u7F6E\u9884\u6D4B")}</span><button type="button" data-toggle-forecast aria-pressed="${!!planningPrediction}" ${!forecastSource.available ? "disabled" : ""}>${t(planningPrediction ? "\u5DF2\u5F00\u542F" : "\u5DF2\u5173\u95ED")}</button></div>${forecastSummary}${BRAND_STAMP}`;
  renderStrategyControls();
  if (!result.available) {
    $("#result").innerHTML = `<p class="empty-result">${escape2(diagnosticText(language, result.reason, "input"))}</p>`;
    return;
  }
  const graph = layoutStrategyTree(result, {
    expandedLevel: null,
    prediction: planningPrediction,
    // Phones fit the whole horizon to the screen (lane names move above their
    // rows); mid widths keep a wider canvas that scrolls sideways.
    viewportWidth: availableWidth < COMPACT_TIMELINE_WIDTH ? workspace.timelineWidth : Math.max(workspace.timelineWidth, availableWidth < 680 ? MOBILE_TIMELINE_WIDTH : 0),
    displayEndHours: planner.displayEndHours,
    locale: language
  });
  const consumption = usageConsumptionSummary(result, { locale: language });
  const policyData = result.recommendation ? ` data-policy-search="${result.recommendation.method}"${result.recommendation.primary ? ' data-plan-basis="predicted-extra-resets-first"' : ""}` : "";
  $("#result").innerHTML = `<section class="strategy-panel" aria-label="${t("\u7528\u91CF\u8BA1\u5212")}"${policyData} style="--panel-padding:${workspace.panelPadding}px">${graph.compact ? phoneSummary(graph, planningPrediction) : ""}<div class="pace-controls"><div data-current-consumption data-daily="${consumption.dailyPercent}"><span>${t("\u5F53\u524D\u65E5\u5747\u6D88\u8017 {daily}%", { daily: round7(consumption.dailyPercent) })}</span></div>
    </div>
    ${result.recommendation && !result.recommendation.primary ? `<div class="timeline-toolbar"><span>${t("\u82E5\u59CB\u7EC8\u6CA1\u6709\u989D\u5916\u91CD\u7F6E")}</span></div>` : ""}
    ${renderStrategyTree(graph, escape2)}
    </section>
    ${renderForecastMethod({ source: forecastSource, prediction: planningPrediction, result, timeZone, locale: language }, escape2)}`;
}
function phoneSummary(graph, prediction) {
  const focus = prediction && graph.forecastFocus;
  const cells = [
    focus ? `<div data-summary="next-reset"><small>${escape2(t("\u4E0B\u6B21\u989D\u5916 reset"))}</small><strong>${escape2(focus.label)}</strong></div>` : "",
    Number.isFinite(prediction?.next48Probability) ? `<div data-summary="next-48h"><small>${escape2(t("\u672A\u6765 48 \u5C0F\u65F6"))}</small><strong>${round7(prediction.next48Probability * 100)}%</strong></div>` : ""
  ].filter(Boolean).join("");
  return `<div class="phone-summary" data-phone-summary>${cells}<button type="button" data-edit-quota>${escape2(t("\u4FEE\u6539\u989D\u5EA6"))}</button>${BRAND_STAMP}</div>`;
}
function dispatchPlanning(action) {
  planner = updateUsagePlanner(planner, action);
  renderResult();
}
async function bundledPrediction(now) {
  const local = !globalThis.location || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location.hostname);
  const paths = ["/api/reset-evidence", "/data/reset-evidence.json", "/experiments/public-reset-events.json"].slice(local ? 0 : 1);
  for (const path of paths) {
    let archive = null;
    try {
      const response = await fetch(path);
      if (response.ok) archive = await response.json();
    } catch {
      archive = null;
    }
    if (Array.isArray(archive?.events)) return predictionFromArchive({ archive, now, timeZone });
  }
  return { available: false, reason: "\u5386\u53F2\u6570\u636E\u52A0\u8F7D\u5931\u8D25\uFF0C\u6682\u4E0D\u9884\u6D4B" };
}
async function calculate2() {
  const run = ++calculationRun;
  $("#error").hidden = true;
  lastError = null;
  setStatus("\u66F4\u65B0\u91CD\u7F6E\u8BC1\u636E\u2026");
  try {
    if (plugin && !manualDraft) {
      const update = await plugin.refresh({
        timeZone,
        language,
        usageStrategy: planner.intent.usageStrategy,
        paceMultiplier: planner.intent.targetMultiplier,
        forecastEnabled: planner.intent.forecastEnabled,
        availabilityMode: planner.intent.availabilityMode,
        alertsEnabled: planner.intent.alertsEnabled
      });
      if (run === calculationRun) importPluginPlan(update);
      return;
    }
    const now = /* @__PURE__ */ new Date();
    let publicForecast = { available: false, reason: "\u9884\u6D4B\u6570\u636E\u6682\u4E0D\u53EF\u7528" };
    try {
      publicForecast = await bundledPrediction(now);
    } catch {
    }
    if (run !== calculationRun) return;
    forecastSource = publicForecast;
    planner = updateUsagePlanner(planner, { type: "new-snapshot", input, now, prediction: publicForecast.prediction });
    renderResult();
    setStatus("\u5DF2\u8BA1\u7B97");
    saveInput();
  } catch (error) {
    if (run !== calculationRun) return;
    planner = updateUsagePlanner(planner, { type: "invalidate" });
    $("#result").classList.add("stale");
    renderStrategyControls();
    lastError = error.message;
    $("#error").textContent = diagnosticText(language, lastError, "input");
    $("#error").hidden = false;
    setStatus("\u8BF7\u68C0\u67E5\u8F93\u5165");
  }
}
function importPluginPlan({ revision, session }) {
  if (!session) return;
  planner = updateUsagePlanner(planner, { type: "import-mcp-plan", session });
  pluginRevision = revision;
  manualDraft = false;
  timeZone = planner.timeZone;
  if (!savedLanguage && supportedLanguage(session.language)) language = session.language;
  input = structuredClone(planner.snapshot.input);
  forecastSource = session.forecastSource;
  lastError = null;
  $("#error").hidden = true;
  renderStaticLanguage();
  renderInputs();
  renderResult();
  setStatus(language === "zh-CN" ? "\u5DF2\u8FDE\u63A5\u672C\u5730 MCP" : "Connected to local MCP");
}
async function startPluginPage() {
  try {
    const update = await plugin.read();
    importPluginPlan(update.session ? update : await plugin.refresh());
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent = error.message;
    setStatus(language === "zh-CN" ? "\u8BF7\u4ECE Codex \u91CD\u65B0\u6253\u5F00\u89C4\u5212\u9875" : "Reopen the planner from Codex");
  }
  const poll = async () => {
    try {
      if (!document.hidden) {
        const update = await plugin.read(pluginRevision);
        if (update.session && update.revision !== pluginRevision) importPluginPlan(update);
      }
    } catch {
      setStatus(language === "zh-CN" ? "MCP \u5DF2\u65AD\u5F00 \xB7 \u5F53\u524D\u4E3A\u4E0A\u6B21\u7ED3\u679C" : "MCP disconnected \xB7 Last snapshot");
    }
    setTimeout(poll, 5e3);
  };
  setTimeout(poll, 5e3);
}
$("#inputs").addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!Object.hasOwn(input, field)) return;
  input[field] = event.target.value === "" ? NaN : Number(event.target.value);
  markChanged();
});
$("#inputs").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !$("#inputs").contains(button)) return;
  const data = button.dataset;
  if (data.delayStep) {
    const total = input.weeklyResetDays * 24 + input.weeklyResetHours + Number(data.delta) * (data.delayStep === "weeklyResetDays" ? 24 : 1);
    if (Number.isInteger(total) && total >= 1 && total <= 168) {
      input.weeklyResetDays = Math.floor(total / 24);
      input.weeklyResetHours = total % 24;
      renderInputs();
      markChanged();
    }
    return;
  }
  if (data.toggleCalendar !== void 0) calendarOpen = !calendarOpen;
  else if (data.monthNav) visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + Number(data.monthNav), 1);
  else if (data.calendarDate) {
    const index = input.resetDates.indexOf(data.calendarDate);
    if (index >= 0) input.resetDates.splice(index, 1);
    else {
      if (input.resetDates.length >= 8) {
        setStatus("\u6700\u591A\u9009\u62E9 8 \u4E2A\u5907\u7528 reset \u65E5\u671F");
        return;
      }
      input.resetDates.push(data.calendarDate);
    }
    calendarOpen = false;
  } else if (data.removeDate) input.resetDates = input.resetDates.filter((date) => date !== data.removeDate);
  else return;
  renderInputs();
  if (!data.monthNav && data.toggleCalendar === void 0) markChanged();
});
$("#calculate").addEventListener("click", calculate2);
function handlePlanClick(event) {
  if (event.target.closest("[data-edit-quota]")) {
    document.querySelector(".input-state")?.scrollIntoView?.({ block: "start" });
    return;
  }
  if (!planner.result) return;
  const availability = event.target.closest("button[data-availability-mode]");
  if (availability) {
    dispatchPlanning({ type: "set-availability-mode", mode: availability.dataset.availabilityMode });
    saveInput();
    return;
  }
  if (event.target.closest("[data-toggle-pace-alerts]")) {
    dispatchPlanning({ type: "toggle-alerts" });
    saveInput();
    return;
  }
  const strategy = event.target.closest("[data-usage-strategy]");
  if (strategy) {
    dispatchPlanning({ type: "set-strategy", strategy: strategy.dataset.usageStrategy });
    saveInput();
    return;
  }
  if (event.target.closest("[data-toggle-forecast]")) {
    dispatchPlanning({ type: "toggle-forecast" });
    saveInput();
    return;
  }
  const assumptionButton = event.target.closest("[data-assume-reset]");
  if (assumptionButton) {
    dispatchPlanning({ type: "toggle-assumption", sequence: assumptionButton.dataset.assumptionSequence });
    return;
  }
  const backup = event.target.closest("[data-backup-choice]");
  if (backup) {
    dispatchPlanning({ type: "toggle-bank", index: backup.dataset.backupChoice });
    return;
  }
}
$("#result").addEventListener("click", handlePlanClick);
$("#strategy-controls").addEventListener("click", handlePlanClick);
$("#forecast").addEventListener("click", handlePlanClick);
var resizeResult = (width) => {
  if (planner.result && width > 0 && Math.abs(width - renderedWidth) >= 2) renderResult(width);
};
if (typeof ResizeObserver === "function") new ResizeObserver((entries) => {
  const width = Math.round(entries[0]?.contentRect.width ?? 0);
  resizeResult(width);
}).observe($("#result"));
if (typeof window !== "undefined") window.addEventListener("resize", () => resizeResult($("#result").clientWidth));
$("#result").addEventListener?.("scroll", (event) => {
  const scroller = event.target;
  if (!scroller.classList?.contains("tree-scroll")) return;
  const shift = scroller.scrollLeft ? `translateX(${scroller.scrollLeft}px)` : "";
  const labels = scroller.querySelectorAll(".timeline-lane-label");
  let cover = scroller.querySelector(".lane-cover");
  if (!cover && labels.length) {
    cover = document.createElement("div");
    cover.className = "lane-cover";
    cover.style.width = `${labels[0].offsetLeft + labels[0].offsetWidth + 8}px`;
    scroller.querySelector(".strategy-graph")?.prepend(cover);
  }
  if (cover) {
    cover.hidden = !shift;
    cover.style.transform = shift;
  }
  for (const label of labels) label.style.transform = shift;
}, true);
$("#language-switch").addEventListener("click", (event) => {
  const button = event.target.closest("[data-language]");
  const selected = supportedLanguage(button?.dataset.language);
  if (!selected || selected === language) return;
  language = selected;
  savedLanguage = selected;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
  }
  renderStaticLanguage();
  renderInputs();
  if (planner.result) renderResult();
  else {
    renderStrategyControls();
    $("#result").innerHTML = t(statusMessage === "\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u8BA1\u7B97" ? statusMessage : "\u70B9\u51FB\u300C\u8BA1\u7B97\u7B56\u7565\u300D\u67E5\u770B\u7ED3\u679C\u3002");
  }
});
renderStaticLanguage();
renderStrategyControls();
$("#result").innerHTML = t("\u70B9\u51FB\u300C\u8BA1\u7B97\u7B56\u7565\u300D\u67E5\u770B\u7ED3\u679C\u3002");
renderInputs();
if (plugin) startPluginPage();
else calculate2();
