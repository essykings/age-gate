import { auth } from "@wix/essentials";
import { appInstances } from "@wix/app-management";

export async function GET() {
  try {
    const elevatedGetAppInstance = auth.elevate(
      appInstances.getAppInstance
    );

    const instanceResponse = await elevatedGetAppInstance();

    // Only the fields the dashboard and editor panel need; not the site or owner details.
    const { instance } = instanceResponse;
    // TEMPORARY: raw plan fields (no site or owner details) to debug the plan check.
    console.info('[plan-debug]', JSON.stringify({
      isFree: instance?.isFree,
      hasBilling: Boolean(instance?.billing),
      billing: instance?.billing,
      freeTrialAvailable: instance?.freeTrialAvailable,
      availablePlans: instance?.availablePlans,
      instanceId: instance?.instanceId,
    }));
    const body = {
      instance: {
        instanceId: instance?.instanceId,
        isFree: instance?.isFree,
        billing: {
          packageName: instance?.billing?.packageName,
          billingCycle: instance?.billing?.billingCycle,
          freeTrialStatus: instance?.billing?.freeTrialInfo?.status,
        },
        freeTrialAvailable: instance?.freeTrialAvailable,
      },
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