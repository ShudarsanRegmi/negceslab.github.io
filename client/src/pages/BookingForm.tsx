import React, { useState, useEffect } from "react";
import type { ReactElement } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  Divider,
  Chip,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import {
  format,
  addDays,
  isBefore,
  startOfDay,
  differenceInDays,
  differenceInHours,
  getDay,
} from "date-fns";
import { computersAPI, bookingsAPI } from "../services/api";

interface Computer {
  _id: string;
  name: string;
  location: string;
  status: "available" | "maintenance" | "booked";
  specifications: string;
}

const steps = [
  "Select Computer",
  "Choose Dates & Times",
  "Project Details",
  "Review & Confirm",
];

const datasetTypes = [
  "Image",
  "Video",
  "Audio",
  "Satellite",
  "Text",
  "Tabular",
  "Time Series",
  "Other",
];

const datasetSizeUnits = ["MB", "GB", "TB"];

const BookingForm: React.FC = (): ReactElement => {
  const [activeStep, setActiveStep] = useState(0);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [selectedComputer, setSelectedComputer] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasGPU, setHasGPU] = useState(false);
  const [currentGPUMemory, setCurrentGPUMemory] = useState<number>(0);
  const [bottleneckExplanation, setBottleneckExplanation] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [datasetType, setDatasetType] = useState("");
  const [datasetLink, setDatasetLink] = useState("");
  const [datasetSize, setDatasetSize] = useState<number>(0);
  const [datasetSizeUnit, setDatasetSizeUnit] = useState<string>("GB");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Function to disable Sundays
  const shouldDisableDate = (date: Date) => {
    return getDay(date) === 0; // 0 = Sunday
  };

  useEffect(() => {
    fetchComputers();
  }, []);

  const fetchComputers = async () => {
    try {
      const response = await computersAPI.getAllComputers();
      setComputers(
        response.data.filter(
          (computer: Computer) => computer.status === "available"
        )
      );
    } catch (error) {
      console.error("Error fetching computers:", error);
      setError("Failed to load computers");
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (
      !selectedComputer ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !reason.trim() ||
      !problemStatement.trim() ||
      !datasetType ||
      !datasetLink.trim() ||
      !bottleneckExplanation.trim() ||
      !datasetSize
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // Check if start date is Sunday
    if (getDay(startDate) === 0) {
      setError(
        "Lab is closed on Sundays. Please select a different start date."
      );
      return;
    }

    // Check if end date is Sunday
    if (getDay(endDate) === 0) {
      setError("Lab is closed on Sundays. Please select a different end date.");
      return;
    }

    if (isBefore(endDate, startDate)) {
      setError("End date must be after or equal to start date");
      return;
    }

    // Check if duration exceeds 7 days
    const durationInDays = differenceInDays(endDate, startDate) + 1; // +1 to include both start and end dates
    if (durationInDays > 7) {
      setError("Booking duration cannot exceed 7 days");
      return;
    }

    // Combine date and time for accurate comparison
    const getDateTime = (date: Date, time: Date) => {
      const d = new Date(date);
      d.setHours(time.getHours(), time.getMinutes(), 0, 0);
      return d;
    };

    const startDateTime =
      startDate && startTime ? getDateTime(startDate, startTime) : null;
    const endDateTime =
      endDate && endTime ? getDateTime(endDate, endTime) : null;

    if (startDateTime && endDateTime && isBefore(endDateTime, startDateTime)) {
      setError("End time must be after start time");
      return;
    }

    // Check minimum booking duration (1 hour) - only for same-day bookings
    if (
      startDateTime &&
      endDateTime &&
      differenceInDays(endDate, startDate) === 0
    ) {
      const durationInHours = differenceInHours(endDateTime, startDateTime);
      if (durationInHours < 1) {
        setError("Minimum booking duration is 1 hour for same-day bookings");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        computerId: selectedComputer,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        startTime: format(startTime, "HH:mm"),
        endTime: format(endTime, "HH:mm"),
        reason: reason.trim(),
        requiresGPU: hasGPU,
        gpuMemoryRequired: currentGPUMemory,
        problemStatement: problemStatement.trim(),
        datasetType,
        datasetSize: {
          value: datasetSize,
          unit: datasetSizeUnit,
        },
        datasetLink: datasetLink.trim(),
        bottleneckExplanation: bottleneckExplanation.trim(),
      };

      await bookingsAPI.createBooking(bookingData);
      setSuccess("Booking request submitted successfully!");

      // Reset form
      setSelectedComputer("");
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setReason("");
      setHasGPU(false);
      setCurrentGPUMemory(0);
      setProblemStatement("");
      setDatasetType("");
      setDatasetSize(0);
      setDatasetSizeUnit("GB");
      setDatasetLink("");
      setBottleneckExplanation("");
      setActiveStep(0);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      setError(error.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Computer
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose from the available computers in the lab
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Computer</InputLabel>
              <Select
                value={selectedComputer}
                onChange={(e) => setSelectedComputer(e.target.value)}
                label="Computer"
              >
                {computers.map((computer) => (
                  <MenuItem key={computer._id} value={computer._id}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {computer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {computer.location} • {computer.specifications}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedComputer && (
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Computer Details:
                </Typography>
                {computers.find((c) => c._id === selectedComputer) && (
                  <Box>
                    <Typography variant="body2">
                      <strong>Name:</strong>{" "}
                      {computers.find((c) => c._id === selectedComputer)?.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Location:</strong>{" "}
                      {
                        computers.find((c) => c._id === selectedComputer)
                          ?.location
                      }
                    </Typography>
                    <Typography variant="body2">
                      <strong>Specifications:</strong>{" "}
                      {
                        computers.find((c) => c._id === selectedComputer)
                          ?.specifications
                      }
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Dates & Times
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select when you want to use the computer
            </Typography>

            {/* Booking Guidelines */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Booking Guidelines:</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                • Lab is closed on Sundays • Maximum booking duration: 7 days •
                Minimum booking duration: 1 hour • Bookings are subject to admin
                approval
              </Typography>
            </Alert>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                minDate={startOfDay(new Date())}
                maxDate={addDays(new Date(), 30)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
                shouldDisableDate={shouldDisableDate}
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                minDate={startDate || startOfDay(new Date())}
                maxDate={addDays(new Date(), 30)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
                shouldDisableDate={shouldDisableDate}
              />

              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(newValue) => setStartTime(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
              />

              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(newValue) => setEndTime(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
              />
            </Box>

            {/* Duration Display */}
            {startDate && endDate && startTime && endTime && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: "#f8f9fa" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Booking Duration:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    // Combine date and time for accurate calculation
                    const getDateTime = (date: Date, time: Date) => {
                      const d = new Date(date);
                      d.setHours(time.getHours(), time.getMinutes(), 0, 0);
                      return d;
                    };
                    const startDateTime = getDateTime(startDate, startTime);
                    const endDateTime = getDateTime(endDate, endTime);
                    const totalMinutes = Math.max(
                      0,
                      Math.floor(
                        (endDateTime.getTime() - startDateTime.getTime()) /
                          60000
                      )
                    );
                    const days = Math.floor(totalMinutes / (60 * 24));
                    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
                    const minutes = totalMinutes % 60;
                    let result = "";
                    if (days > 0) result += `${days} day(s) `;
                    if (hours > 0) result += `${hours} hour(s) `;
                    if (minutes > 0) result += `${minutes} minute(s)`;
                    if (!result) result = "0 minutes";
                    return result.trim();
                  })()}
                </Typography>
                {differenceInDays(endDate, startDate) + 1 > 7 && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    ⚠️ Duration exceeds 7-day limit
                  </Typography>
                )}
                {differenceInDays(endDate, startDate) === 0 &&
                  differenceInHours(endTime, startTime) < 1 && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      ⚠️ Duration is less than 1 hour
                    </Typography>
                  )}
              </Paper>
            )}

            <TextField
              fullWidth
              label="Reason for Booking"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={3}
              sx={{ mt: 3 }}
              size={isMobile ? "small" : "medium"}
              placeholder="Please describe why you need to book this computer..."
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please provide details about your project and computational
              requirements
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <TextField
                  fullWidth
                  label="Problem Statement"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  multiline
                  rows={3}
                  required
                  placeholder="Describe your research problem or project objective..."
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <FormControl fullWidth required>
                  <InputLabel>Dataset Type</InputLabel>
                  <Select
                    value={datasetType}
                    onChange={(e) => setDatasetType(e.target.value)}
                    label="Dataset Type"
                  >
                    {datasetTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    sx={{ flex: 1 }}
                    type="number"
                    label="Dataset Size"
                    value={datasetSize}
                    onChange={(e) => setDatasetSize(Number(e.target.value))}
                    required
                    inputProps={{ min: 0 }}
                  />
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={datasetSizeUnit}
                      onChange={(e) => setDatasetSizeUnit(e.target.value)}
                      label="Unit"
                    >
                      {datasetSizeUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Dataset Link"
                value={datasetLink}
                onChange={(e) => setDatasetLink(e.target.value)}
                required
                placeholder="Provide a link to your dataset or its location..."
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Hardware Configuration
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControl component="fieldset">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Do you have a GPU in your current setup?
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Button
                        variant={hasGPU ? "contained" : "outlined"}
                        onClick={() => setHasGPU(true)}
                        color={hasGPU ? "primary" : "inherit"}
                      >
                        Yes, I have a GPU
                      </Button>
                      <Button
                        variant={!hasGPU ? "contained" : "outlined"}
                        onClick={() => setHasGPU(false)}
                        color={!hasGPU ? "primary" : "inherit"}
                      >
                        No GPU
                      </Button>
                    </Box>
                  </FormControl>

                  {hasGPU && (
                    <TextField
                      fullWidth
                      type="number"
                      label="What is your current GPU Memory (GB)?"
                      value={currentGPUMemory}
                      onChange={(e) =>
                        setCurrentGPUMemory(Number(e.target.value))
                      }
                      required
                      inputProps={{ min: 0, max: 48 }}
                      helperText="Enter the memory capacity of your current GPU in gigabytes"
                    />
                  )}

                  <TextField
                    fullWidth
                    label="Explain your computational bottleneck"
                    value={bottleneckExplanation}
                    onChange={(e) => setBottleneckExplanation(e.target.value)}
                    multiline
                    rows={4}
                    required
                    placeholder="Describe why your current setup is insufficient. For example:
- What are the limitations you're facing?
- How long does your current computation take?
- What performance improvements do you need?
- Why do you need the lab's computational resources?"
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Confirm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review your booking details before confirming
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Computer
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {computers.find((c) => c._id === selectedComputer)?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {
                      computers.find((c) => c._id === selectedComputer)
                        ?.location
                    }
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body1">
                    {startDate &&
                      endDate &&
                      `${format(startDate, "MMM d, yyyy")} - ${format(
                        endDate,
                        "MMM d, yyyy"
                      )}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {startTime &&
                      endTime &&
                      `${format(startTime, "h:mm a")} - ${format(
                        endTime,
                        "h:mm a"
                      )}`}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body1">{reason}</Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Project Details
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    Problem Statement
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {problemStatement}
                  </Typography>

                  <Typography variant="body1" fontWeight="bold">
                    Dataset Information
                  </Typography>
                  <Typography variant="body2">Type: {datasetType}</Typography>
                  <Typography variant="body2">
                    Size: {datasetSize} {datasetSizeUnit}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Link: {datasetLink}
                  </Typography>

                  <Typography variant="body1" fontWeight="bold">
                    Current Hardware Configuration
                  </Typography>
                  <Typography variant="body2">
                    Has GPU: {hasGPU ? "Yes" : "No"}
                  </Typography>
                  {hasGPU && (
                    <Typography variant="body2">
                      Current GPU Memory: {currentGPUMemory} GB
                    </Typography>
                  )}
                  <Typography variant="body2" paragraph>
                    Bottleneck Explanation: {bottleneckExplanation}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Booking Guidelines:</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                • Bookings are subject to admin approval • Maximum booking
                duration is 7 days • Resource allocation will be based on your
                computational needs • Please arrive on time for your scheduled
                slot
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return "Unknown step";
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Book a Computer
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          {/* Stepper */}
          <Stepper
            activeStep={activeStep}
            sx={{
              mb: 4,
              display: { xs: "none", md: "flex" },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Mobile Step Indicator */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Chip
              label={`Step ${activeStep + 1} of ${steps.length}: ${
                steps[activeStep]
              }`}
              color="primary"
              variant="outlined"
            />
          </Box>

          {/* Step Content */}
          <Box sx={{ mt: 2, mb: 4 }}>{getStepContent(activeStep)}</Box>

          {/* Navigation Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              fullWidth={isMobile}
            >
              Back
            </Button>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  {loading ? "Submitting..." : "Submit Booking"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && !selectedComputer) ||
                    (activeStep === 1 &&
                      (!startDate ||
                        !endDate ||
                        !startTime ||
                        !endTime ||
                        !reason.trim()))
                  }
                  fullWidth={isMobile}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingForm;
