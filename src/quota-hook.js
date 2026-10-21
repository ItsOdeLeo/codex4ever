// Codex hook entry (bundled as plugins/codex4ever/hooks/quota-check.mjs).
// Prints hook JSON only when there is something to tell the user; always
// exits 0 so a prompt is never blocked.
import { runQuotaHook } from './usage-alert-hook.js';

let input='';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin)input+=chunk;
let event='UserPromptSubmit';
try {event=JSON.parse(input||'{}').hook_event_name??event;} catch {/* Use the default event. */}
const output=await runQuotaHook({event}).catch(()=>null);
if(output)process.stdout.write(JSON.stringify(output));
process.exit(0);
