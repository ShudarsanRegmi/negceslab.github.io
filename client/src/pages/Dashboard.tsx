import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Computer as ComputerIcon,
  BookOnline as BookingIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingIcon,
  Cancel as CancelIcon,
  Notifications as NotificationIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  ArrowUpward as ArrowUpIcon,
  AccessTime as ClockIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { bookingsAPI, computersAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface Booking {
  _id: string;
  computerId: {
    _id: string;
    name: string;
    location: string;
    specifications?: string;
  };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  rejectionReason?: string;
  createdAt: string;
}

interface Computer {
  _id: string;
  name: string;
  location: string;
  status: "available" | "maintenance" | "booked";
  specifications: string;
  currentBookings?: Booking[];
  nextAvailable?: string;
  nextAvailableDate?: string;
}

const Dashboard: React.FC = () => {
  const { userRole } = useAuth(); // Get userRole from auth context
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [selectedBookingDetails, setSelectedBookingDetails] =
    useState<Booking | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, computersRes] = await Promise.all([
        bookingsAPI.getUserBookings(),
        computersAPI.getComputersWithBookings(),
      ]);
      setBookings(bookingsRes.data);
      setComputers(computersRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingsAPI.cancelBooking(bookingId);
      // Refresh the data after cancellation
      fetchData();
      setCancelDialogOpen(false);
      setSelectedBookingId(null);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      setError("Failed to cancel booking");
    }
  };

  const openCancelDialog = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    setCancelDialogOpen(false);
    setSelectedBookingId(null);
  };

  const handleRowClick = (booking: Booking) => {
    setSelectedBookingDetails(booking);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedBookingDetails(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "pending":
        return "warning";
      case "cancelled":
        return "info";
      default:
        return "info";
    }
  };

  const getComputerStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "maintenance":
        return "warning";
      case "booked":
        return "error";
      default:
        return "info";
    }
  };

  const recentBookings = bookings.slice(0, 5);
  const availableComputers = computers.filter(
    (c: Computer) => c.status === "available"
  ).length;
  const maintenanceComputers = computers.filter(
    (c: Computer) => c.status === "maintenance"
  ).length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(
    (b: Booking) => b.status === "pending"
  ).length;
  const activeBookings = bookings.filter(
    (b: Booking) => b.status === "approved"
  ).length;
  const totalComputers = computers.length;
  const labUtilization =
    totalComputers > 0
      ? Math.round((activeBookings / totalComputers) * 100)
      : 0;

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" width={280} height={120} />
          ))}
        </Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // // If user is admin, don't show the dashboard
  // if (userRole === 'admin') {
  //   return (
  //     <Box sx={{ p: 3 }}>
  //       <Typography variant="h6">
  //         Please use the Admin Dashboard to manage bookings and computers.
  //       </Typography>
  //     </Box>
  //   );
  // }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
        {/* Total Computers */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 12px)",
              md: "1 1 calc(25% - 18px)",
            },
          }}
        >
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: 2,
              minHeight: 140,
            }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                "&:last-child": { pb: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Total Computers
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
                    }}
                  >
                    {totalComputers}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ArrowUpIcon sx={{ color: "#4caf50", fontSize: 14 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: "#4caf50", fontSize: "0.75rem" }}
                    >
                      {availableComputers} Available
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    bgcolor: "rgba(33, 150, 243, 0.15)",
                    borderRadius: 1.5,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    height: 44,
                  }}
                >
                  <ComputerIcon sx={{ color: "#1976d2", fontSize: 22 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Active Bookings */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 12px)",
              md: "1 1 calc(25% - 18px)",
            },
          }}
        >
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: 2,
              minHeight: 140,
            }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                "&:last-child": { pb: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Active Bookings
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
                    }}
                  >
                    {activeBookings}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ClockIcon sx={{ color: "#ff9800", fontSize: 14 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: "#ff9800", fontSize: "0.75rem" }}
                    >
                      {pendingBookings} Pending
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    bgcolor: "rgba(255, 152, 0, 0.15)",
                    borderRadius: 1.5,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    height: 44,
                  }}
                >
                  <BookingIcon sx={{ color: "#f57c00", fontSize: 22 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Users Online */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 12px)",
              md: "1 1 calc(25% - 18px)",
            },
          }}
        >
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: 2,
              minHeight: 140,
            }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                "&:last-child": { pb: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Users Online
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
                    }}
                  >
                    {activeBookings}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PeopleIcon sx={{ color: "#4caf50", fontSize: 14 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: "#4caf50", fontSize: "0.75rem" }}
                    >
                      Active Now
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    bgcolor: "rgba(76, 175, 80, 0.15)",
                    borderRadius: 1.5,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    height: 44,
                  }}
                >
                  <PeopleIcon sx={{ color: "#2e7d32", fontSize: 22 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Lab Utilization */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 12px)",
              md: "1 1 calc(25% - 18px)",
            },
          }}
        >
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: 2,
              minHeight: 140,
            }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                "&:last-child": { pb: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Lab Utilization
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
                    }}
                  >
                    {labUtilization}%
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ArrowUpIcon sx={{ color: "#4caf50", fontSize: 14 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: "#4caf50", fontSize: "0.75rem" }}
                    >
                      +5% from yesterday
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    bgcolor: "rgba(33, 150, 243, 0.15)",
                    borderRadius: 1.5,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    height: 44,
                  }}
                >
                  <BarChartIcon sx={{ color: "#1976d2", fontSize: 22 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Content Grid */}
      <Box>
        {/* Recent Bookings - Only show for non-admin users */}
        {userRole !== "admin" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Bookings
              </Typography>
              {recentBookings.length === 0 ? (
                <Typography
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  No bookings yet
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size={isMobile ? "small" : "medium"}>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Computer</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created On</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentBookings.map((booking) => (
                        <TableRow
                          key={booking._id}
                          onClick={() => handleRowClick(booking)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {booking._id.slice(-6).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {booking.computerId?.name || "Unknown Computer"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {booking.computerId?.location ||
                                  "Unknown Location"}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {isNaN(new Date(booking.startDate).getTime())
                                ? "Invalid date"
                                : format(
                                    new Date(booking.startDate),
                                    "yyyy-MM-dd"
                                  )}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {booking.startTime}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {isNaN(new Date(booking.endDate).getTime())
                                ? "Invalid date"
                                : format(
                                    new Date(booking.endDate),
                                    "yyyy-MM-dd"
                                  )}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {booking.endTime}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={booking.status}
                              color={getStatusColor(booking.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {isNaN(new Date(booking.createdAt).getTime())
                                ? "Invalid date"
                                : format(
                                    new Date(booking.createdAt),
                                    "yyyy-MM-dd HH:mm:ss"
                                  )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {booking.status === "pending" && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={() => openCancelDialog(booking._id)}
                                sx={{ minWidth: "auto", px: 1 }}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Booking Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Booking Details
          <Chip
            label={selectedBookingDetails?.status}
            color={getStatusColor(selectedBookingDetails?.status || "") as any}
            size="small"
            sx={{ ml: 1 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedBookingDetails && (
            <Box sx={{ py: 1 }}>
              {/* Computer Information */}
              <Typography variant="h6" gutterBottom color="primary">
                Computer Details
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Name:</strong>{" "}
                  {selectedBookingDetails.computerId.name}
                </Typography>
                <Typography variant="body1">
                  <strong>Location:</strong>{" "}
                  {selectedBookingDetails.computerId.location}
                </Typography>
                {selectedBookingDetails.computerId.specifications && (
                  <Typography variant="body1">
                    <strong>Specifications:</strong>{" "}
                    {selectedBookingDetails.computerId.specifications}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Booking Information */}
              <Typography variant="h6" gutterBottom color="primary">
                Booking Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Start Date:</strong>{" "}
                  {format(
                    new Date(selectedBookingDetails.startDate),
                    "MMMM d, yyyy"
                  )}
                </Typography>
                <Typography variant="body1">
                  <strong>End Date:</strong>{" "}
                  {format(
                    new Date(selectedBookingDetails.endDate),
                    "MMMM d, yyyy"
                  )}
                </Typography>
                <Typography variant="body1">
                  <strong>Time:</strong> {selectedBookingDetails.startTime} -{" "}
                  {selectedBookingDetails.endTime}
                </Typography>
                <Typography variant="body1">
                  <strong>Purpose:</strong> {selectedBookingDetails.reason}
                </Typography>
                <Typography variant="body1">
                  <strong>Status:</strong>{" "}
                  <Chip
                    label={selectedBookingDetails.status}
                    color={getStatusColor(selectedBookingDetails.status) as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body1">
                  <strong>Created:</strong>{" "}
                  {new Date(selectedBookingDetails.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {/* Show rejection reason if booking was rejected */}
              {selectedBookingDetails.status === "rejected" &&
                selectedBookingDetails.rejectionReason && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom color="error">
                        Rejection Reason
                      </Typography>
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {selectedBookingDetails.rejectionReason}
                      </Alert>
                    </Box>
                  </>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          {selectedBookingDetails?.status === "pending" && (
            <Button
              color="error"
              onClick={() => {
                handleCloseDetails();
                openCancelDialog(selectedBookingDetails._id);
              }}
            >
              Cancel Booking
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onClose={closeCancelDialog}>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          Are you sure you want to cancel this booking? This action cannot be
          undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() =>
              selectedBookingId && handleCancelBooking(selectedBookingId)
            }
            color="error"
            variant="contained"
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
