"use client";
import { Typography, Button, Stack } from "@mui/material";
import useSWR from "swr";
import DashboardCard from "@/app//components/shared/DashboardCard";
import { ChevronLeft } from "@mui/icons-material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Link from "next/link";
import Skeleton from "@mui/material/Skeleton";
import ListTable from "@/app/components/shared/ListTable";
import useSWRMutation from "swr/mutation";
import { useRouter, useParams } from "next/navigation";

import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { getRequest, deleteRequest } from "@/app/api/requests";

dayjs.extend(LocalizedFormat);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

const getDataForTable = (data) => {
  return [
    ["Name", data.recipient_name],
    ["Tenant ID", data.tenant_id],
    ["Created", dayjs(data.created_at).format("LLL z").toString()],
    ["Updated", dayjs(data.modified_at).format("LLL z").toString()],
  ];
};

const RecipientDetails = () => {
  const params = useParams();
  const { id } = params;
  const { data, error, isLoading } = useSWR(`/recipients/${id}`, getRequest);
  const { trigger: triggerDelete } = useSWRMutation(
    `/recipients/${id}`,
    deleteRequest
  );
  const router = useRouter();

  if (error) {
    return <Typography>Error with API</Typography>;
  }
  if (isLoading) {
    return <Typography>Loading screen!</Typography>;
  }

  const dataForTable = getDataForTable(data);

  return (
    <DashboardCard
      title={data.recipient_name}
      topContent={
        <Button
          variant="contained"
          href="/recipients"
          component={Link}
          sx={{ marginBottom: "24px" }}
          startIcon={<ChevronLeft />}
        >
          <Typography>Back</Typography>
        </Button>
      }
    >
      <ListTable title={"Details"} data={dataForTable} />
      <Stack direction="row" spacing={3} marginTop="20px">
        <Button
          variant="contained"
          startIcon={<DeleteIcon />}
          color="error"
          onClick={() => {
            triggerDelete();
            router.push("/recipients");
          }}
        >
          Delete
        </Button>
      </Stack>
    </DashboardCard>
  );
};

export default RecipientDetails;
