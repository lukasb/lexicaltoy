import { fetchPages } from "@/lib/dbFetch";
import EditingArea from "../../components/EditingArea";
import { isDevelopmentEnvironment } from "@/lib/environment";
import { SignoutButton } from "../../components/SignoutButton";
import { getSessionServer } from "@/lib/getAuth";
import type { ReactElement } from 'react'
import Layout from '@/components/layout'
import type { NextPageWithLayout } from '@/pages/_app'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { Session } from 'next-auth';
import { Page as AppPage } from '@/lib/definitions';

export const maxDuration = 60;

interface PageProps {
  session: Session | null;
  pages: AppPage[] | null;
}

export const getServerSideProps: GetServerSideProps<PageProps> = (async ({req, res}) => {
  console.log("getServerSideProps");
  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    console.log("Problem with session in getServerSideProps", session);
    return {
      props: {
        session: null,
        pages: null
      }
    }
  }
  
  let pages = await fetchPages(session.id);
  if (pages) {
    pages = JSON.parse(JSON.stringify(pages));
  } else {
    console.log("Problem with pages in getServerSideProps", pages);
  }
  
  return {
    props: {
      session,
      pages
    }
  }
});

const Page: NextPageWithLayout<InferGetServerSidePropsType<typeof getServerSideProps>> = ({session, pages}) => {
  if (!session || !session.id || !pages) {
    if (!session || !session.id) {
      console.log("Problem with session", session);
      return (
        <div className="flex justify-center items-center">
          <h1>Problem with authentication</h1>
          <SignoutButton />
        </div>
      );
    } else if (!pages) {
      console.log("No pages");
      return (
        <div className="flex justify-center items-center">
          <h1>No pages</h1>
          <SignoutButton />
        </div>
      );
    }
  }

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

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      {page}
    </Layout>
  )
}

export default Page;