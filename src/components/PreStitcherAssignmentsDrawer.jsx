import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Typography,
  Stack,
} from "@mui/material";
import { Close, Edit, TrendingUp } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import PreStitcherAssignmentProgressModal from "../Modals/PreStitcherAssignmentProgressModal";
import { showSnackbar } from "../Slice/snackbarSlice";
import axiosInstance from "../utils/axiosInstance";

const PRE_STITCHER_OP_KEYS = [
  "label",
  "flacket",
  "covering",
  "pocket",
  "shoulder",
  "chockPatti",
];

const getOptionLabel = (optionKey) => {
  const labels = {
    label: "Label",
    flacket: "Flacket",
    covering: "Covering",
    pocket: "Pocket",
    shoulder: "Shoulder",
    chockPatti: "Chock Patti",
  };
  return labels[optionKey] || optionKey;
};

const PreStitcherAssignmentsDrawer = ({ open, onClose, memo, onUpdate }) => {
  const dispatch = useDispatch();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    if (open && memo) {
      fetchAssignments();
    }
  }, [open, memo]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const memoId = memo.deliveryMemoId || memo._id;
      const response = await axiosInstance.get(
        `/pre-stitchers/memos/${memoId}/pre-stitcher-assignments`,
      );
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      dispatch(
        showSnackbar({
          open: true,
          severity: "error",
          message: "Failed to load assignment details",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const openProgressModal = (assignment) => {
    if (!assignment?.optionProgress?.length) {
      fetchAssignments();
      return;
    }
    setSelectedAssignment(assignment);
    setProgressModalOpen(true);
  };

  const closeProgressModal = () => {
    setProgressModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleProgressUpdate = () => {
    fetchAssignments();
    if (onUpdate) onUpdate();
  };

  const getOverallProgress = () => {
    if (!assignments || assignments.length === 0) return 0;

    let totalAssigned = 0;
    let totalCompleted = 0;

    assignments.forEach((a) => {
      if (a.optionProgress) {
        a.optionProgress.forEach((p) => {
          totalAssigned += p.totalQuantity || 0;
          totalCompleted += p.completedQuantity || 0;
        });
      }
    });

    return totalAssigned > 0
      ? Math.round((totalCompleted / totalAssigned) * 100)
      : 0;
  };

  const getTotalShirtsAssigned = () => {
    if (!assignments || assignments.length === 0) return 0;
    // Calculate total shirts based on unique assignments and item counts
    let total = 0;
    assignments.forEach((a) => {
      if (a.assignedOptions) {
        a.assignedOptions.forEach((opt) => {
          total += opt.quantity || 0;
        });
      }
    });
    return total;
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 500 },
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <Box
            sx={{
              p: 3,
              borderBottom: "1px solid #e5e7eb",
              bgcolor: "#f9fafb",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Pre-Stitcher Assignments
                </Typography>
              </Box>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
            {loading ? (
              <Box sx={{ py: 2 }}>
                <LinearProgress />
              </Box>
            ) : assignments.length === 0 ? (
              <Alert severity="info">No assignment data available</Alert>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Overall Progress */}
                <Card
                  sx={{
                    p: 2,
                    bgcolor: "#f0f9ff",
                    border: "1px solid #bae6fd",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TrendingUp sx={{ fontSize: 20, color: "#3b82f6" }} />
                      <Typography
                        sx={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#1e40af",
                        }}
                      >
                        Overall Progress
                      </Typography>
                    </Box>
                    <Chip
                      label={`${getOverallProgress()}%`}
                      size="small"
                      sx={{
                        backgroundColor: "#3b82f6",
                        color: "white",
                        fontWeight: 700,
                      }}
                    />
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={getOverallProgress()}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1.5,
                      backgroundColor: "#dbeafe",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: "#3b82f6",
                      },
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#1e40af",
                      fontWeight: 600,
                    }}
                  >
                    Total Assigned Shirts Across Options: {getTotalShirtsAssigned()}
                  </Typography>
                </Card>

                <Divider />

                {/* Individual Assignments */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#111827",
                      mb: 2,
                    }}
                  >
                    Workers Assigned ({assignments.length})
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {assignments.map((assignment, idx) => (
                      <Card
                        key={idx}
                        sx={{
                          p: 2,
                          border: "2px solid",
                          borderColor:
                            assignment.status === "COMPLETED"
                              ? "#86efac"
                              : assignment.status === "IN_PROGRESS"
                                ? "#fdba74"
                                : "#93c5fd",
                          bgcolor:
                            assignment.status === "COMPLETED"
                              ? "#f0fdf4"
                              : assignment.status === "IN_PROGRESS"
                                ? "#fff7ed"
                                : "#eff6ff",
                        }}
                      >
                        {/* Header */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#111827",
                              }}
                            >
                              {assignment.preStitcherName}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "11px",
                                color: "#6b7280",
                              }}
                            >
                              {assignment.preStitcherEmail}
                            </Typography>
                          </Box>
                          <Chip
                            label={assignment.status?.replace(/_/g, " ")}
                            size="small"
                            sx={{
                              fontSize: "10px",
                              height: "20px",
                              fontWeight: 700,
                              backgroundColor:
                                assignment.status === "COMPLETED"
                                  ? "#16a34a"
                                  : assignment.status === "IN_PROGRESS"
                                    ? "#ea580c"
                                    : "#3b82f6",
                              color: "white",
                            }}
                          />
                        </Box>

                        {/* Options */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              color: "#6b7280",
                              mb: 0.5,
                              fontWeight: 600,
                            }}
                          >
                            Assigned Operations:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              flexWrap: "wrap",
                            }}
                          >
                            {assignment.assignedOptions?.map((opt, i) => (
                              <Chip
                                key={i}
                                label={`${getOptionLabel(opt.option)}: ${opt.quantity}`}
                                size="small"
                                sx={{
                                  fontSize: "10px",
                                  height: "22px",
                                  backgroundColor: "#f3f4f6",
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              />
                            ))}
                          </Box>
                        </Box>

                        {/* Progress Details */}
                        {assignment.optionProgress &&
                          assignment.optionProgress.length > 0 && (
                            <Box sx={{ mb: 1.5 }}>
                              <Typography
                                sx={{
                                  fontSize: "11px",
                                  color: "#6b7280",
                                  mb: 1,
                                  fontWeight: 600,
                                }}
                              >
                                Progress:
                              </Typography>
                              {assignment.optionProgress.map((progress, i) => {
                                const percentage =
                                  progress.totalQuantity > 0
                                    ? (progress.completedQuantity /
                                        progress.totalQuantity) *
                                      100
                                    : 0;

                                return (
                                  <Box key={i} sx={{ mb: 1 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        mb: 0.5,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {getOptionLabel(progress.option)}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: "11px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {progress.completedQuantity}/
                                        {progress.totalQuantity}
                                      </Typography>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={percentage}
                                      sx={{
                                        height: 5,
                                        borderRadius: 2.5,
                                        backgroundColor: "#e5e7eb",
                                        "& .MuiLinearProgress-bar": {
                                          backgroundColor:
                                            progress.completedQuantity ===
                                            progress.totalQuantity
                                              ? "#16a34a"
                                              : "#3b82f6",
                                        },
                                      }}
                                    />
                                    {progress.inProgressQuantity > 0 && (
                                      <Typography
                                        sx={{
                                          fontSize: "9px",
                                          color: "#ea580c",
                                          mt: 0.25,
                                        }}
                                      >
                                        {progress.inProgressQuantity} in progress
                                      </Typography>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}

                        {/* Action Button */}
                        {assignment.status !== "COMPLETED" && (
                          <Button
                            variant="contained"
                            fullWidth
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => openProgressModal(assignment)}
                            sx={{
                              textTransform: "none",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Update Progress
                          </Button>
                        )}
                      </Card>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Progress Update Modal */}
      <PreStitcherAssignmentProgressModal
        open={progressModalOpen}
        onClose={closeProgressModal}
        assignment={selectedAssignment}
        onSuccess={handleProgressUpdate}
      />
    </>
  );
};

export default PreStitcherAssignmentsDrawer;
