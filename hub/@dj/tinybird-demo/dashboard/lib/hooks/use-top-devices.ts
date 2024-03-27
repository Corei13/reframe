import { queryPipe } from "../api.ts";
import devices from "../constants/devices.ts";
import { TopDevices, TopDevicesData } from "../types/top-devices.ts";
import useDateFilter from "./use-date-filter.ts";
import useQuery from "./use-query.ts";

async function getTopDevices(
  date_from?: string,
  date_to?: string,
): Promise<TopDevices> {
  const { data: queryData } = await queryPipe<TopDevicesData>("top_devices", {
    date_from,
    date_to,
    limit: 4,
  });
  const data = [...queryData]
    .sort((a, b) => b.visits - a.visits)
    .map(({ device, visits }) => ({
      device: devices[device] ?? device,
      visits,
    }));

  return { data };
}

export default function useTopDevices() {
  const { startDate, endDate } = useDateFilter();
  return useQuery(
    [startDate, endDate, "topDevices"],
    (args) => getTopDevices(args[0], args[1]),
  );
}
