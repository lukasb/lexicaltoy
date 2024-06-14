import { signOut } from "next-auth/react";
import { Button } from "../ui/button";

export default async function Logout() {
  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
        <Button onClick={() => signOut()}>
          <div>Sign Out</div>
        </Button>
      </div>
    </div>
  );
}
