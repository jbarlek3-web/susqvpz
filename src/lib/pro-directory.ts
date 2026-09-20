import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requirePro } from "@/lib/entitlement.server";
import { consumeRateLimit } from "@/lib/rate-limit.server";

export type CountyDirectoryRecord = {
  county: string;
  departmentName: string;
  websiteUrl: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  physicalAddress: string | null;
  countyZoningStatus: "YES" | "NO" | "UNKNOWN";
  directorOrZoningOfficer: string | null;
};

export type MunicipalityDirectoryRecord = {
  county: string;
  municipality: string;
  municipalityWebsiteUrl: string | null;
  ecode360Url: string | null;
  countyPlanningUrl: string | null;
};

export type CountyDirectoryPayload = {
  source: string;
  records: CountyDirectoryRecord[];
};

export type MunicipalityDirectoryPayload = {
  source: string;
  compiled: string;
  records: MunicipalityDirectoryRecord[];
};

async function authorizeDirectoryRequest(userId: string) {
  await requirePro();
  await consumeRateLimit({
    action: "pro-directory",
    subject: userId,
    max: 30,
    windowSeconds: 60,
  });
}

export const getProCountyDirectory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CountyDirectoryPayload> => {
    await authorizeDirectoryRequest(context.userId);
    const { countyDirectory } = await import("@/lib/pro-directory.server");
    return countyDirectory();
  });

export const getProMunicipalityDirectory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MunicipalityDirectoryPayload> => {
    await authorizeDirectoryRequest(context.userId);
    const { municipalityDirectory } = await import("@/lib/pro-directory.server");
    return municipalityDirectory();
  });

export type CountyDocumentItem = {
  title: string;
  url: string;
  description: string;
};

export type CountyDocumentRecord = {
  county: string;
  departmentName: string;
  websiteUrl: string;
  documentLinks: CountyDocumentItem[];
};

export type CountyDocumentPayload = {
  source: string;
  records: CountyDocumentRecord[];
};

export type MunicipalDocRecord = {
  County: string;
  Municipality: string;
  "Municipality URL": string;
  "Muni Forms": string;
  "Municipil Code Download": string;
  "Municipal SALDO": string;
  "Multiple Stormwater & Sanitary Sewer Solutions": string;
  "Zoning Map": string;
};

export type MunicipalDocPayload = {
  source: string;
  records: MunicipalDocRecord[];
};

export const getProCountyDocumentLinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CountyDocumentPayload> => {
    await authorizeDirectoryRequest(context.userId);
    const { countyDocumentLinks } = await import("@/lib/pro-directory.server");
    return countyDocumentLinks();
  });

export const getProMunicipalDocumentLinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MunicipalDocPayload> => {
    await authorizeDirectoryRequest(context.userId);
    const { municipalDocumentLinks } = await import("@/lib/pro-directory.server");
    return municipalDocumentLinks();
  });


