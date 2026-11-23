import { z } from "zod";

function httpsFrom(hostname:string) {
  return z.url().refine(value => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === hostname && !parsed.username && !parsed.password;
  });
}
export const referenceImage = z.object({
  title:z.string().min(1).max(200),creator:z.string().max(250),
  thumbnail:httpsFrom("upload.wikimedia.org"),source:httpsFrom("commons.wikimedia.org"),
  license:z.string().min(1).max(80),licenseUrl:httpsFrom("creativecommons.org").optional(),
});
export const referenceImages = z.array(referenceImage).max(6);

type Metadata = Record<string,{value?:string}>;
const plain = (value:string|undefined) => (value ?? "").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();

export async function searchCommonsImages(query:string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action:"query",format:"json",formatversion:"2",generator:"search",gsrnamespace:"6",
    gsrsearch:query+" filetype:bitmap",gsrlimit:"12",prop:"imageinfo",
    iiprop:"url|extmetadata",iiurlwidth:"480",iiextmetadatafilter:"LicenseShortName|LicenseUrl|Artist",
  }).toString();
  const response = await fetch(url,{signal:AbortSignal.timeout(6500),redirect:"error",headers:{"User-Agent":"SkyxDigitalStudy/1.0 (educational image references)"}});
  if (!response.ok) throw new Error("Reference image search is unavailable.");
  const data = await response.json() as {query?:{pages?:{title:string;imageinfo?:{thumburl?:string;descriptionurl?:string;extmetadata?:Metadata}[]}[]}};
  const results = [];
  for (const page of data.query?.pages ?? []) {
    const file = page.imageinfo?.[0];
    const metadata = file?.extmetadata;
    const license = plain(metadata?.LicenseShortName?.value);
    if (!/^(public domain|cc0|cc by(?:-sa)?(?: \d\.\d)?)$/i.test(license)) continue;
    const licenseUrl = metadata?.LicenseUrl?.value?.replace(/^\/\//,"https://");
    const parsed = referenceImage.safeParse({
      title:page.title.replace(/^File:/,"").slice(0,200),creator:plain(metadata?.Artist?.value).slice(0,250),
      thumbnail:file?.thumburl,source:file?.descriptionurl,license,licenseUrl,
    });
    if (parsed.success) results.push(parsed.data);
    if (results.length===6) break;
  }
  return results;
}
