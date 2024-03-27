import AnalyticsProvider from "../components/Provider.tsx";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";
import Widgets from "../components/Widgets.tsx";
import Credentials from "../components/Credentials/index.ts";
import useAuth from "../lib/hooks/use-auth.ts";
import Meta from "../components/Meta.tsx";
import ErrorModal from "../components/ErrorModal.tsx";

export default function DashboardPage() {
  const { isAuthenticated, isTokenValid } = useAuth();

  return (
    <AnalyticsProvider>
      <Meta />
      <div className="min-h-screen px-5 py-5 text-sm leading-5 bg-body sm:px-10 text-secondary">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-6 sm:space-y-10">
            {isAuthenticated && isTokenValid && (
              <>
                <img src="/icon.png" alt="" width={24} height={24} />
                <Header />
              </>
            )}
            <main>
              {isAuthenticated && !isTokenValid && <ErrorModal />}
              {isAuthenticated && isTokenValid && <Widgets />}
              {!isAuthenticated && <Credentials />}
            </main>
          </div>
          {isAuthenticated && (
            <div className="mt-20">
              <Footer />
            </div>
          )}
        </div>
      </div>
    </AnalyticsProvider>
  );
}
