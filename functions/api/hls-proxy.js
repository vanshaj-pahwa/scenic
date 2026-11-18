import { handleHlsProxy } from "../../lib/hlsProxy.js";

export const onRequest = (context) => handleHlsProxy(context.request, context.env);
