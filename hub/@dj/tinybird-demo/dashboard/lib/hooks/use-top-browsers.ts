import { queryPipe } from "../api.ts";
import browsers from "../constants/browsers.ts";
import { TopBrowsers, TopBrowsersData } from "../types/top-browsers.ts";
import useDateFilter from "./use-date-filter.ts";
import useQuery from "./use-query.ts";

async function getTopBrowsers(
  date_from?: string,
  date_to?: string,
): Promise<TopBrowsers> {
  const { data: queryData } = await queryPipe<TopBrowsersData>("top_browsers", {
    date_from,
    date_to,
    limit: 4,
  });
  const data = [...queryData]
    .sort((a, b) => b.visits - a.visits)
    .map(({ browser, visits }) => ({
      browser: browsers[browser] ?? browser,
      visits,
    }));

  return { data };
}

export default function useTopBrowsers() {
  const { startDate, endDate } = useDateFilter();
  return useQuery(
    [startDate, endDate, "topBrowsers"],
    (args) => getTopBrowsers(args[0], args[1]),
  );
}
