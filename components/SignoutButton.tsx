import { Button } from "@/_app/ui/button";
import { signOut } from "next-auth/react";
import { localDb } from "@/_app/context/storage/db";

export const SignoutButton = () => {
  const handleClick = () => {
    signOut();
    localDb.delete();
  };
  return (
    <Button onClick={handleClick}>
      <div>Sign Out</div>
    </Button>
  );
}
