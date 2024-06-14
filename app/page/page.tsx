import { fetchPages } from "../lib/dbFetch";
import EditingArea from "./EditingArea";
import { isDevelopmentEnvironment } from "../lib/environment";
import { SignoutButton } from "./SignoutButton";
import { getSessionServer } from "../lib/auth";

export const maxDuration = 60;

export default async function Home() {
  const session = await getSessionServer();
  if (!session || !session.id) {
    if (session) {
      console.log("Problem with session", session);
    } else {
      console.log("No session");
    }
    return (
      <div className="flex justify-center items-center">
        <h1>Problem with authentication</h1>
        <SignoutButton />
      </div>
    );
  }

  const pages = await fetchPages(session.id);

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
        {isDevelopmentEnvironment && (
          <div className="absolute top-0 left-0 bg-red-500 text-white p-0.5">
            dev
          </div>
        )}
        <EditingArea pages={pages} userId={session.id} />
        <SignoutButton />
      </div>
    </div>
  );
}
