"use client";
import {
  Typography,
  Box,
  Button,
  Stack,
  MenuItem,
  Divider,
  Checkbox,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import { useState } from "react";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import { ChevronLeft } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import FormTextInput from "@/app/components/forms/FormTextInput";
import FormSelect from "@/app/components/forms/FormSelect";
import PageContainer from "@/app/components/container/PageContainer";
import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
  pollTaskStatus,
} from "@/app/api/requests";

import {
  SnowflakeConnectionDetails,
  getSnowflakeValidation,
  getSnowflakeInitialValues,
} from "@/app/components/forms/connection-details/SnowflakeConnectionDetails";
import {
  BigQueryConnectionDetails,
  getBigQueryValidation,
  getBigQueryInitialValues,
} from "@/app/components/forms/connection-details/BigQueryConnectionDetails";
import {
  RedshiftConnectionDetails,
  getRedshiftValidation,
  getRedshiftInitialValues,
} from "@/app/components/forms/connection-details/RedshiftConnectionDetails";
import {
  PostgresConnectionDetails,
  getPostgresValidation,
  getPostgresInitialValues,
} from "@/app/components/forms/connection-details/PostgresConnectionDetails";

const AddDestination = () => {
  const Status = Object.freeze({
    NOT_STARTED: 0,
    LOADING: 1,
    SUCCESS: 2,
    FAILED: 3,
  });

  // state of the connection test
  const [testConnectionStatus, setTestConnectionStatus] = useState(
    Status.NOT_STARTED
  );

  // state for the source being created
  const [destinationCreated, setDestinationCreated] = useState(false);
  const [destinationId, setDestinationId] = useState("");

  const router = useRouter();

  const createDestination = (params) => {
    return postRequest("/destinations", { arg: params });
  };

  const updateDestination = (destinationId, params) => {
    return putRequest(`/destinations/${destinationId}`, { arg: params });
  };

  const startDestinationCheck = (destinationId) => {
    return postRequest(`/destinations/${destinationId}/check`, { arg: {} });
  };

  const waitForDestinationCheck = (destinationId, taskId) => {
    return pollTaskStatus(`/destinations/${destinationId}/check/${taskId}`);
  };

  const updateCheckState = (result) => {
    if (!result.success || result.success === false) {
      setTestConnectionStatus(Status.FAILED);
    } else {
      setTestConnectionStatus(Status.SUCCESS);
    }
  };

  const {
    data: recipients,
    error: recipientsError,
    isLoading: recipientsLoading,
  } = useSWR("/recipients", getRequest);

  const {
    data: models,
    error: modelsError,
    isLoading: modelsLoading,
  } = useSWR("/models", getRequest);
  const modelIds = models?.map((m) => m.model_id);

  // form submission handler
  const handleCreateAndCheckDestination = async (values, validateForm) => {
    setTestConnectionStatus(Status.LOADING);
    const errors = await validateForm(values);
    if (Object.keys(errors).length > 0) {
      console.log(errors);
      setTestConnectionStatus(Status.FAILED);
      return;
    }
    const params = {
      destination_name: values.destination_name,
      vendor_type: values.vendor_type,
      recipient_id: values.recipient_id,
      schedule: {
        type: "INCREMENTAL",
        frequency: values.schedule_frequency,
        day: values.schedule_day,
        hour: values.schedule_hour,
        minute: 0,
      },
      models: values.selectedModels,
      connection_info: {
        vendor_type: values.vendor_type,
        ...values[values.vendor_type],
      },
    };

    try {
      if (!destinationCreated) {
        console.log("Creating destination");
        const result = await createDestination(params);
        const check = await startDestinationCheck(result.destination_id);
        const status = await waitForDestinationCheck(
          result.destination_id,
          check.task_id
        );

        setDestinationCreated(true);
        setDestinationId(result.destination_id);
        updateCheckState(status);
      } else {
        console.log("Updating destination");
        await updateDestination(destinationId, params);
        const check = await startDestinationCheck(destinationId);
        const status = await waitForDestinationCheck(
          destinationId,
          check.task_id
        );
        updateCheckState(status);
      }
    } catch (e) {
      setTestConnectionStatus(Status.FAILED);
    } finally {
    }
  };

  // when the create button is clicked
  const handleEnableDestination = async () => {
    if (destinationCreated) {
      try {
        await updateDestination(destinationId, {
          is_enabled: true,
          state: "CREATED",
        });
        router.push("/destinations");
      } catch (e) {
        console.log("Enabling destination failed: ", e);
      }
    }
  };

  if (recipientsError || modelsError) {
    return <Typography>Error with API</Typography>;
  }
  if (recipientsLoading || modelsLoading) {
    return <Typography>Loading screen!</Typography>;
  }

  return (
    <PageContainer
      title="Create Destination"
      description="Create Destination for data export"
    >
      <Box>
        <Button
          variant="contained"
          href="/destinations"
          component={Link}
          startIcon={<ChevronLeft />}
        >
          <Typography>Back</Typography>
        </Button>
        <Formik
          initialValues={{
            vendor_type: "snowflake",
            destination_name: "",
            recipient_id: "",
            selectedModels: [...modelIds],
            snowflake: getSnowflakeInitialValues(true),
            redshift: getRedshiftInitialValues(true),
            bigquery: getBigQueryInitialValues(true),
            postgresql: getPostgresInitialValues(true),
            schedule_frequency: "DAILY",
            schedule_day: 0,
            schedule_hour: 0,
          }}
          enableReinitialize={true}
          validationSchema={Yup.object({
            vendor_type: Yup.string()
              .oneOf(
                ["snowflake", "redshift", "bigquery", "postgresql"],
                "Invalid destination type"
              )
              .required("Required"),
            destination_name: Yup.string().required("Required"),
            recipient_id: Yup.string().required("Required"),
            selectedModels: Yup.array().required("Required"),

            snowflake: Yup.lazy((_, { parent }) =>
              parent.vendor_type === "snowflake"
                ? getSnowflakeValidation(true).required("Required")
                : Yup.mixed().notRequired()
            ),
            redshift: Yup.lazy((_, { parent }) =>
              parent.vendor_type === "redshift"
                ? getRedshiftValidation(true).required("Required")
                : Yup.mixed().notRequired()
            ),
            bigquery: Yup.lazy((_, { parent }) =>
              parent.vendor_type === "bigquery"
                ? getBigQueryValidation(true).required("Required")
                : Yup.mixed().notRequired()
            ),
            postgresql: Yup.lazy((_, { parent }) =>
              parent.vendor_type === "postgresql"
                ? getPostgresValidation(true).required("Required")
                : Yup.mixed().notRequired()
            ),
            schedule_frequency: Yup.string()
              .oneOf(["DAILY", "WEEKLY", "HOURLY"])
              .required("Required"),
            schedule_day: Yup.number()
              .integer()
              .min(0)
              .max(6)
              .required("Required"),
            schedule_hour: Yup.number()
              .integer()
              .min(0)
              .max(23)
              .required("Required"),
          })}
          onSubmit={handleEnableDestination}
        >
          {({
            values,
            isSubmitting,
            setFieldValue,
            isValidating,
            validateForm,
            isValid,
            dirty,
          }) => {
            const selected = values.selectedModels;
            const allSelected =
              modelIds.length > 0 &&
              modelIds.every((id) => selected.includes(id));
            const someSelected = selected.length > 0 && !allSelected;

            const toggleSelectAll = (e) => {
              if (e.target.checked) {
                setFieldValue("selectedModels", [...modelIds]);
              } else {
                setFieldValue("selectedModels", []);
              }
            };

            const toggleModel = (id) => (e) => {
              if (e.target.checked) {
                setFieldValue("selectedModels", [...selected, id]);
              } else {
                setFieldValue(
                  "selectedModels",
                  selected.filter((m) => m !== id)
                );
              }
            };
            return (
              <Form>
                <Stack maxWidth={"sm"} spacing={3}>
                  <Typography variant="h2" sx={{ paddingTop: "20px" }}>
                    Create Destination
                  </Typography>

                  <FormSelect
                    id="vendor_type"
                    titleText="Destination Type"
                    name="vendor_type"
                  >
                    <MenuItem value={"snowflake"} selected>
                      Snowflake
                    </MenuItem>
                    <MenuItem value={"redshift"}>Redshift</MenuItem>
                    <MenuItem value={"bigquery"}>BigQuery</MenuItem>
                    <MenuItem value={"postgresql"}>Postgres</MenuItem>
                  </FormSelect>

                  <FormTextInput
                    label="Destination Name"
                    name="destination_name"
                    helperText="Descriptive name only visible internally for reference."
                  />

                  <FormSelect
                    id="recipient_id"
                    titleText="Recipient"
                    name="recipient_id"
                    helperText="Choose a recipient (must be created before a destination can be added)"
                  >
                    {recipients.map((recipient) => (
                      <MenuItem
                        key={recipient.recipient_id}
                        value={recipient.recipient_id}
                      >{`${recipient.recipient_name}`}</MenuItem>
                    ))}
                  </FormSelect>

                  <Divider />

                  <Typography sx={{ fontWeight: 600, marginBottom: "4px" }}>
                    Enter the destination credentials
                  </Typography>

                  {renderConnectionDetails(
                    values.vendor_type,
                    setFieldValue,
                    values
                  )}

                  <Divider />

                  {renderScheduleDetails(values.schedule_frequency)}

                  <Divider />

                  <Typography sx={{ fontWeight: 600, marginBottom: "4px" }}>
                    Select the models to sync to this destination
                  </Typography>
                  <Stack direction="row" xs={12} alignItems="center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                    />
                    <Typography sx={{ fontWeight: 600 }}>Select All</Typography>
                  </Stack>
                  {models.map((model) => (
                    <Stack
                      direction="row"
                      key={model.model_id}
                      xs={12}
                      alignItems="center"
                    >
                      <Checkbox
                        checked={selected.includes(model.model_id)}
                        onChange={toggleModel(model.model_id)}
                      />
                      <Stack>
                        <Typography sx={{ fontWeight: 600 }}>
                          {model.model_name}
                        </Typography>
                        <Typography>{model.model_description}</Typography>
                      </Stack>
                    </Stack>
                  ))}
                  <Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Button
                        type="button"
                        variant="contained"
                        disabled={
                          isValidating ||
                          testConnectionStatus == Status.LOADING ||
                          !isValid ||
                          !dirty
                        }
                        onClick={() =>
                          handleCreateAndCheckDestination(values, validateForm)
                        }
                      >
                        Test Connection
                      </Button>
                      {testConnectionStatus == Status.LOADING ? (
                        <CircularProgress size={28} />
                      ) : null}
                      {testConnectionStatus == Status.SUCCESS ? (
                        <Typography fontSize={26}>✅</Typography>
                      ) : null}
                      {testConnectionStatus == Status.FAILED ? (
                        <Typography fontSize={26}>❌</Typography>
                      ) : null}
                    </Stack>
                    <FormHelperText>
                      Testing the connection may take a few minutes.
                    </FormHelperText>
                  </Stack>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      isSubmitting || !(testConnectionStatus == Status.SUCCESS)
                    }
                    sx={{ width: "fit-content" }}
                  >
                    Create
                  </Button>
                </Stack>
              </Form>
            );
          }}
        </Formik>
      </Box>
    </PageContainer>
  );
};

const renderConnectionDetails = (vendor_type, setFieldValue, values) => {
  switch (vendor_type) {
    case "snowflake":
      return <SnowflakeConnectionDetails isDestination={true} />;
    case "bigquery":
      return <BigQueryConnectionDetails isDestination={true} />;
    case "redshift":
      return <RedshiftConnectionDetails isDestination={true} />;
    case "postgresql":
      return <PostgresConnectionDetails isDestination={true} />;
    default:
      return <Typography>Error: Destination type not supported</Typography>;
  }
};

const renderScheduleDetails = (schedule_frequency) => {
  return (
    <>
      <Typography sx={{ fontWeight: 600, marginBottom: "4px" }}>
        Select the schedule for this destination
      </Typography>
      <Stack direction="row" spacing={2}>
        <FormSelect
          id="schedule_frequency"
          titleText="Schedule Frequency"
          name="schedule_frequency"
        >
          <MenuItem value={"WEEKLY"}>Weekly</MenuItem>
          <MenuItem value={"DAILY"}>Daily</MenuItem>
          <MenuItem value={"HOURLY"}>Hourly</MenuItem>
        </FormSelect>

        {schedule_frequency === "WEEKLY" ? (
          <FormSelect
            id="schedule_day"
            titleText="Schedule Day"
            name="schedule_day"
          >
            <MenuItem value={0}>Sunday</MenuItem>
            <MenuItem value={1}>Monday</MenuItem>
            <MenuItem value={2}>Tuesday</MenuItem>
            <MenuItem value={3}>Wednesday</MenuItem>
            <MenuItem value={4}>Thursday</MenuItem>
            <MenuItem value={5}>Friday</MenuItem>
            <MenuItem value={6}>Saturday</MenuItem>
          </FormSelect>
        ) : null}
        {schedule_frequency === "DAILY" || schedule_frequency === "WEEKLY" ? (
          <FormSelect
            id="schedule_hour"
            titleText="Schedule Hour (UTC)"
            name="schedule_hour"
          >
            <MenuItem value={0}>12:00 AM</MenuItem>
            <MenuItem value={1}>1:00 AM</MenuItem>
            <MenuItem value={2}>2:00 AM</MenuItem>
            <MenuItem value={3}>3:00 AM</MenuItem>
            <MenuItem value={4}>4:00 AM</MenuItem>
            <MenuItem value={5}>5:00 AM</MenuItem>
            <MenuItem value={6}>6:00 AM</MenuItem>
            <MenuItem value={7}>7:00 AM</MenuItem>
            <MenuItem value={8}>8:00 AM</MenuItem>
            <MenuItem value={9}>9:00 AM</MenuItem>
            <MenuItem value={10}>10:00 AM</MenuItem>
            <MenuItem value={11}>11:00 AM</MenuItem>
            <MenuItem value={12}>12:00 PM</MenuItem>
            <MenuItem value={13}>1:00 PM</MenuItem>
            <MenuItem value={14}>2:00 PM</MenuItem>
            <MenuItem value={15}>3:00 PM</MenuItem>
            <MenuItem value={16}>4:00 PM</MenuItem>
            <MenuItem value={17}>5:00 PM</MenuItem>
            <MenuItem value={18}>6:00 PM</MenuItem>
            <MenuItem value={19}>7:00 PM</MenuItem>
            <MenuItem value={20}>8:00 PM</MenuItem>
            <MenuItem value={21}>9:00 PM</MenuItem>
            <MenuItem value={22}>10:00 PM</MenuItem>
            <MenuItem value={23}>11:00 PM</MenuItem>
          </FormSelect>
        ) : null}
      </Stack>
    </>
  );
};

export default AddDestination;
