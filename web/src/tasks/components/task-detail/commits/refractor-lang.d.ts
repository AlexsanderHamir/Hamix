declare module "refractor/lang/*.js" {
  import type { RefractorLanguage } from "refractor";
  const lang: RefractorLanguage;
  export default lang;
}
