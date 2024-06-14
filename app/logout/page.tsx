import { SignoutButton } from "../page/SignoutButton";

export default async function Logout() {
  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
        <SignoutButton />
      </div>
    </div>
  );
}
