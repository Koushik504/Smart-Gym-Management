import { requireUser, memberAccess } from "./auth";
import { checkOrigin, fail, json } from "./http";
import { db } from "./db";
import { type Resource, positiveId } from "./validation";
import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
} from "./services";

export type IdContext = { params: Promise<{ id: string }> };

// Each route fixes its resource on the server; clients cannot select a model.
export function collectionHandlers(resource: Resource) {
  return {
    async GET(request: Request) {
      try {
        return json(
          await listResource(
            resource,
            await requireUser(),
            new URL(request.url),
          ),
        );
      } catch (error) {
        return fail(error);
      }
    },
    async POST(request: Request) {
      try {
        checkOrigin(request);
        const actor = await requireUser();
        return json(
          await createResource(resource, actor, await request.json()),
          201,
        );
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export function detailHandlers(resource: Resource) {
  return {
    async PATCH(request: Request, context: IdContext) {
      try {
        checkOrigin(request);
        const actor = await requireUser();
        const { id } = await context.params;
        return json(
          await updateResource(resource, actor, id, await request.json()),
        );
      } catch (error) {
        return fail(error);
      }
    },
    async DELETE(request: Request, context: IdContext) {
      try {
        checkOrigin(request);
        const actor = await requireUser();
        return json(
          await deleteResource(resource, actor, (await context.params).id),
        );
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export async function memberDetail(_request: Request, context: IdContext) {
  try {
    const actor = await requireUser();
    const id = positiveId((await context.params).id);
    await memberAccess(actor, id);
    return json(
      await db.member.findUniqueOrThrow({
        where: { id },
        include: {
          trainer: { include: { user: { select: { name: true } } } },
          subscriptions: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              status: true,
              price: actor.role !== "TRAINER",
              package: { select: { id: true, name: true } },
              payment: { select: { status: true } },
            },
            orderBy: { id: "desc" },
          },
          attendance: { orderBy: { date: "desc" }, take: 30 },
          assignments: {
            include: {
              plan: { include: { exercises: { include: { exercise: true } } } },
            },
          },
        },
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
