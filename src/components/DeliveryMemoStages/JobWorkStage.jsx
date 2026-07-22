import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Grid,
  Skeleton,
  Typography,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import moment from "moment";
import axiosInstance from "../../utils/axiosInstance";
import { getMemoTitle } from "../../utils/deliveryMemo";
import { CreateButton } from "../Styled";
import NoResponsePage from "../../pages/NoResponsePage";
import MemoDetailDrawer from "../../Modals/MemoDetailDrawer";
import CreateJobWorkMemoModal from "../../Modals/CreateJobWorkMemoModal";
import AssignJobWorkerDialog from "../../Modals/AssignJobWorkerDialog";
import { showSnackbar } from "../../Slice/snackbarSlice";
import { useLoading } from "../hooks/useLoading";

const JobWorkStage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { setLoading: setGlobalLoading } = useLoading();

  const [searchDmNumber, setSearchDmNumber] = useState(
    () => location.state?.searchDmNumber || ""
  );

  useEffect(() => {
    if (location.state?.searchDmNumber) {
      setSearchDmNumber(location.state.searchDmNumber);
    }
  }, [location.state]);

  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState({ open: false, memo: null });
  const [detailDrawer, setDetailDrawer] = useState({ open: false, memo: null });
  const [updatingId, setUpdatingId] = useState(null);

  const fetchJobWorkMemos = useCallback(async () => {
    try {
      setLoading(true);
      setGlobalLoading(true);
      const response = await axiosInstance.get("/delivery-memos/by-stage", {
        params: { stage: "JOB_WORK" },
      });
      const sorted = (response.data?.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setMemos(sorted);
    } catch (error) {
      console.error("Failed to fetch Job Work memos:", error);
      setMemos([]);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  useEffect(() => {
    if (user) {
      fetchJobWorkMemos();
    }
  }, [user, fetchJobWorkMemos]);

  const handleUpdateStatus = async (memoId, newStatus) => {
    try {
      setUpdatingId(memoId);
      setGlobalLoading(true);
      const userId = user?.id || user?._id || user?.userId;
      await axiosInstance.patch(`/delivery-memos/${memoId}/job-work-status`, {
        jobWorkStatus: newStatus,
        performedBy: String(userId || ""),
      });

      dispatch(
        showSnackbar({
          open: true,
          severity: "success",
          message:
            newStatus === "COMPLETED"
              ? "Memo marked as Completed & Closed!"
              : `Status updated to ${newStatus.replace("_", " ")}`,
        })
      );

      await fetchJobWorkMemos();
    } catch (error) {
      console.error("Failed to update status:", error);
      dispatch(
        showSnackbar({
          open: true,
          severity: "error",
          message: error.response?.data?.message || "Failed to update status",
        })
      );
    } finally {
      setUpdatingId(null);
      setGlobalLoading(false);
    }
  };

  const groupedMemos = useMemo(() => {
    const pending = memos.filter(
      (m) =>
        (!m.jobWorkWorkerName || m.jobWorkStatus === "PENDING" || !m.jobWorkStatus) &&
        m.status !== "CLOSED"
    );
    const inProcess = memos.filter(
      (m) =>
        Boolean(m.jobWorkWorkerName || m.jobWorkWorkerId) &&
        m.jobWorkStatus === "IN_PROCESS" &&
        m.status !== "CLOSED"
    );

    return { pending, inProcess };
  }, [memos]);

  const getCurrentMemos = () => {
    switch (activeTab) {
      case 0:
        return groupedMemos.pending;
      case 1:
        return groupedMemos.inProcess;
      default:
        return groupedMemos.pending;
    }
  };

  const getStatusChipProps = (memo) => {
    const status = memo.jobWorkStatus || "PENDING";
    const isClosed = memo.status === "CLOSED";

    if (isClosed || status === "COMPLETED") {
      return {
        label: "Completed",
        sx: { backgroundColor: "#d1fae5", color: "#065f46", fontWeight: 600, fontSize: "11px", height: "22px" },
      };
    }
    if (status === "IN_PROCESS") {
      return {
        label: "In Process",
        sx: { backgroundColor: "#dbeafe", color: "#1e40af", fontWeight: 600, fontSize: "11px", height: "22px" },
      };
    }
    return {
      label: "Unassigned",
      sx: { backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 600, fontSize: "11px", height: "22px" },
    };
  };

  useEffect(() => {
    if (searchDmNumber && memos.length > 0) {
      const q = searchDmNumber.trim().toLowerCase();
      const matched = memos.find((m) => {
        const dm = (m.dmNumber || "").toLowerCase();
        const id = (m.deliveryMemoId || m._id || "").toLowerCase();
        return dm === q || id === q || dm.includes(q) || id.includes(q);
      });
      if (matched) {
        if (matched.jobWorkStatus === "IN_PROCESS" && (matched.jobWorkWorkerName || matched.jobWorkWorkerId)) {
          setActiveTab(1);
        } else {
          setActiveTab(0);
        }
      }
    }
  }, [searchDmNumber, memos]);

  const currentMemosList = useMemo(() => {
    if (!searchDmNumber || !searchDmNumber.trim()) return getCurrentMemos();
    const q = searchDmNumber.trim().toLowerCase();
    return memos.filter((m) => {
      const dm = (m.dmNumber || "").toLowerCase();
      const id = (m.deliveryMemoId || m._id || "").toLowerCase();
      return dm === q || id === q || dm.includes(q) || id.includes(q);
    });
  }, [memos, searchDmNumber, activeTab, groupedMemos]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            mb: 3,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Skeleton
            variant="rectangular"
            width={{ xs: "100%", sm: 250 }}
            height={44}
          />
          <Skeleton
            variant="text"
            width={{ xs: "100%", sm: 180 }}
            height={40}
          />
        </Box>
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={360}
                sx={{ borderRadius: "12px" }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Search Filter Active Banner */}
      {searchDmNumber && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#eef2ff",
            p: 1.5,
            px: 2,
            borderRadius: "10px",
            border: "1px solid #c7d2fe",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Chip
              label={`DM Search Filter: "${searchDmNumber}"`}
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Typography fontSize="13px" color="#3730a3" fontWeight={500}>
              Showing only matched Delivery Memo on this stage
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSearchDmNumber("");
              try {
                window.history.replaceState({}, document.title);
              } catch (e) {}
            }}
            sx={{
              textTransform: "none",
              fontSize: "12px",
              fontWeight: 600,
              borderColor: "#6366f1",
              color: "#4338ca",
              backgroundColor: "#ffffff",
              "&:hover": { backgroundColor: "#f5f3ff" },
            }}
          >
            Show All Stage Memos
          </Button>
        </Box>
      )}

      {/* Sub Stages Navigation Paper */}
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#ffffff",
          mb: 2.5,
          borderBottom: "1px solid #e3e8ee",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          pr: { xs: 0, sm: 1 },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "14px",
              fontWeight: 600,
              minHeight: 56,
              color: "#697386",
              px: 3,
              "&.Mui-selected": {
                color: "#1a1f36",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#667eea",
              height: 2,
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <span>Pending Assignment</span>
                <Badge
                  badgeContent={groupedMemos.pending.length}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: "#fff4e5",
                      color: "#7a5b00",
                      fontWeight: 700,
                      minWidth: 20,
                      height: 20,
                      fontSize: "11px",
                    },
                  }}
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <span>In Process</span>
                <Badge
                  badgeContent={groupedMemos.inProcess.length}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: "#e3f2fd",
                      color: "#1565c0",
                      fontWeight: 700,
                      minWidth: 20,
                      height: 20,
                      fontSize: "11px",
                    },
                  }}
                />
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ py: 1 }}>
          <CreateButton
            variant="contained"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Job Work Memo
          </CreateButton>
        </Box>
      </Paper>

      {currentMemosList.length === 0 ? (
        <NoResponsePage />
      ) : (
        <Grid container spacing={2.5}>
          {currentMemosList.map((memo) => {
            const chipProps = getStatusChipProps(memo);
            const fabricSKU = memo.fabricSKU || memo.items?.[0]?.fabricSKU || "N/A";
            const fabricGiven = memo.fabricGiven || memo.totalDhapFold || 0;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={memo.deliveryMemoId}>
                <Card
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    backgroundColor: "#ffffff",
                    height: "380px",
                    width: "350px",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    {/* Header */}
                    <Box
                      sx={{
                        mb: 1,
                        pb: 1,
                        borderBottom: "2px solid #e5e7eb",
                        flexShrink: 0,
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
                        <Tooltip
                          title={getMemoTitle(memo)}
                          arrow
                          placement="top"
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "15px",
                              color: "#111827",
                              cursor: "default",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {getMemoTitle(memo)}
                          </Typography>
                        </Tooltip>
                        <Chip
                          label={chipProps.label}
                          size="small"
                          sx={chipProps.sx}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        {moment(memo.createdAt).format("DD/MM/YYYY HH:mm")}
                      </Typography>
                    </Box>

                    {/* Middle Info Area */}
                    <Box
                      sx={{
                        mb: 0.5,
                        height: "135px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      {/* Worker */}
                      <Box sx={{ flexShrink: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "#6b7280",
                            fontWeight: 600,
                            mb: 0.5,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Worker Name
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: memo.jobWorkWorkerName ? "#111827" : "#9ca3af",
                            fontStyle: memo.jobWorkWorkerName ? "normal" : "italic",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {memo.jobWorkWorkerName
                            ? `${memo.jobWorkWorkerName}${memo.jobWorkWorkerPhone ? ` (${memo.jobWorkWorkerPhone})` : ""}`
                            : "Not assigned yet"}
                        </Typography>
                      </Box>

                      {/* Fabric Given Box */}
                      <Box
                        sx={{
                          backgroundColor: "#f9fafb",
                          borderRadius: "8px",
                          p: 1.5,
                          height: "75px",
                          flexShrink: 0,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              color: "#6b7280",
                              fontWeight: 600,
                              mb: 0.5,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Fabric Given ({fabricSKU})
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#059669",
                            }}
                          >
                            {fabricGiven} m
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Bottom Actions Section */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.8,
                        mt: "auto",
                        flexShrink: 0,
                      }}
                    >
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setDetailDrawer({ open: true, memo })}
                        sx={{
                          textTransform: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          height: "36px",
                          borderColor: "#667eea",
                          color: "#667eea",
                          "&:hover": {
                            borderColor: "#667eea",
                            backgroundColor: "rgba(102, 126, 234, 0.04)",
                          },
                        }}
                      >
                        Details
                      </Button>

                      {/* Pending Tab Actions (Assign Worker button) */}
                      {activeTab === 0 && (
                        <CreateButton
                          variant="contained"
                          fullWidth
                          startIcon={<PersonAddIcon />}
                          onClick={() => setAssignDialog({ open: true, memo })}
                        >
                          Assign Worker
                        </CreateButton>
                      )}

                      {/* In Process Tab Actions (Complete & Close button) */}
                      {activeTab === 1 && (
                        <CreateButton
                          variant="contained"
                          fullWidth
                          disabled={updatingId === memo.deliveryMemoId}
                          onClick={() => handleUpdateStatus(memo.deliveryMemoId, "COMPLETED")}
                          sx={{
                            height: "36px",
                            fontSize: "12px",
                            backgroundColor: "#059669 !important",
                            "&:hover": { backgroundColor: "#047857 !important" },
                          }}
                        >
                          Complete & Close
                        </CreateButton>
                      )}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Modal */}
      <CreateJobWorkMemoModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onMemoCreated={fetchJobWorkMemos}
        currentUser={user}
      />

      {/* Assign Worker Dialog */}
      <AssignJobWorkerDialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, memo: null })}
        memo={assignDialog.memo}
        onSuccess={fetchJobWorkMemos}
        currentUser={user}
      />

      {/* Details Drawer */}
      <MemoDetailDrawer
        open={detailDrawer.open}
        onClose={() => setDetailDrawer({ open: false, memo: null })}
        memo={detailDrawer.memo}
        title="Job Work Memo Details"
      />
    </Box>
  );
};

export default JobWorkStage;
