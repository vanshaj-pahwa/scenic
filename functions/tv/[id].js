import { bindEnv } from "../../lib/env.js";
import { renderTitlePage } from "../../lib/page.js";

export async function onRequest(context) {
  bindEnv(context.env);
  return renderTitlePage({
    type: "tv",
    id: context.params.id,
    request: context.request,
    env: context.env,
  });
}
