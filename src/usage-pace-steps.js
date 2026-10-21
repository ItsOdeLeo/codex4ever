/** Allowed target paces, relative to the observed average. */
export const paceChoices = [0,10,20,30,50,100].map(increasePercent=>({
  multiplier:1+increasePercent/100,
  label:increasePercent ? `增加 ${increasePercent}%` : '保持当前用量'
}));
