import { auth } from "@wix/essentials";
import { appInstances } from "@wix/app-management";

export async function GET() {
  try {
    const elevatedGetAppInstance = auth.elevate(
      appInstances.getAppInstance
    );

    const instanceResponse = await elevatedGetAppInstance();

    // Only the fields the dashboard and editor panel need; not the site or owner details.
    const { instance, site } = instanceResponse;
    // The site's main language, so the dashboard previews the built-in popup wording
    // visitors will actually see.
    const primaryLanguage = site?.multilingual?.supportedLanguages?.find((language) => language.isPrimary)?.languageCode;
    const body = {
      instance: {
        instanceId: instance?.instanceId,
        isFree: instance?.isFree,
        billing: { packageName: instance?.billing?.packageName },
      },
      siteLanguage: primaryLanguage || site?.locale || null,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error getting app instance:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to get app instance",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}