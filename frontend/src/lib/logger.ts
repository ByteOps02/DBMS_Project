import log from "loglevel";
log.setLevel(import.meta.env.PROD ? "warn" : "trace");

export default log;
