import { queryPipe } from "../api.ts";
import { TopPagesData, TopPagesSorting } from "../types/top-pages.ts";
import useDateFilter from "./use-date-filter.ts";
import useParams from "./use-params.ts";
import useQuery from "./use-query.ts";

async function getTopPages(
  sorting: TopPagesSorting,
  date_from?: string,
  date_to?: string,
) {
  const { data: queryData, meta } = await queryPipe<TopPagesData>("top_pages", {
    limit: 8,
    date_from,
    date_to,
  });
  const data = [...queryData].sort((a, b) => b[sorting] - a[sorting]);

  const columnLabels = {
    pathname: "content",
    visits: "visitors",
    hits: "pageviews",
  };
  const columns = meta.map(({ name }) => ({
    label: columnLabels[name],
    value: name,
  }));
  const pages = data.map(({ pathname }) => pathname);
  const labels = data.map((record) => record[sorting]);

  return {
    data,
    columns,
    pages,
    labels,
  };
}

export default function useTopPages() {
  const { startDate, endDate } = useDateFilter();
  const [sorting] = useParams({
    key: "top_pages_sorting",
    defaultValue: TopPagesSorting.Visitors,
    values: Object.values(TopPagesSorting),
  });
  return useQuery(
    [sorting, startDate, endDate, "topPages"],
    (args) => getTopPages(args[0], args[1], args[2]),
  );
}
