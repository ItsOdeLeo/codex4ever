/** One product name. Settings read the new USAGE_PLANNER_* names first and
 * still accept the old CODEX4EVER_* names, so existing setups keep working. */
export const PRODUCT_NAME='Usage Planner';
// The Chinese pages use their own name; the domain stays the same.
export const PRODUCT_NAME_ZH='赛博牛马规划器';
export const PRODUCT_ID='usage-planner';
export const PRODUCT_DOMAIN='usageplanner.com';
export const plannerEnv=(name,env=process.env)=>env[`USAGE_PLANNER_${name}`]??env[`CODEX4EVER_${name}`];
