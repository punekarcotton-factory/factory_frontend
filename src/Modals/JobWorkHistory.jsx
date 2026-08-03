import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Paper,
  Typography,
  Chip,
  IconButton,
  Card,
  Grid,
  Skeleton,
} from "@mui/material";
import {
  Visibility,
  Work,
  CheckCircle,
  HourglassEmpty,
  Straighten,
  Assignment,
} from "@mui/icons-material";
import moment from "moment";
import axiosInstance from "../utils/axiosInstance";
import NoResponsePage from "../pages/NoResponsePage";
import { StyledTableCell, StyledTableRow } from "../components/Styled";
import MemoDetailDrawer from "./MemoDetailDrawer";
import { useLoading } from "../components/hooks/useLoading";

export default function JobWorkHistory() {
  const { setLoading: setGlobalLoading } = useLoading();
  const [summaryData, setSummaryData] = useState({
    summary: {
      totalMemos: 0,
      activeCount: 0,
      completedCount: 0,
      pendingCount: 0,
      inProcessCount: 0,
      totalFabricGiven: 0,
    },
    history: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchJobWorkSummary = async () => {
      try {
        setLoading(true);
        setGlobalLoading(true);
        const response = await axiosInstance.get(
          "/delivery-memos/job-work/summary",
        );
        setSummaryData(response.data?.data || { summary: {}, history: [] });
      } catch (error) {
        console.error("Failed to fetch Job Work summary:", error);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    fetchJobWorkSummary();
  }, [setGlobalLoading]);

  const handleViewDetails = async (memoId) => {
    try {
      const res = await axiosInstance.get(`/delivery-memos/${memoId}`);
      setSelectedMemo(res.data?.data || res.data);
      setDetailDrawerOpen(true);
    } catch (err) {
      console.error("Failed to fetch memo details:", err);
    }
  };

  const getStatusChip = (jobWorkStatus, memoStatus) => {
    if (memoStatus === "CLOSED" || jobWorkStatus === "COMPLETED") {
      return (
        <Chip
          label="Completed & Closed"
          size="small"
          sx={{
            backgroundColor: "#d1fae5",
            color: "#065f46",
            fontWeight: 600,
            fontSize: "11px",
          }}
        />
      );
    }
    if (jobWorkStatus === "IN_PROCESS") {
      return (
        <Chip
          label="In Process"
          size="small"
          sx={{
            backgroundColor: "#dbeafe",
            color: "#1e40af",
            fontWeight: 600,
            fontSize: "11px",
          }}
        />
      );
    }
    return (
      <Chip
        label="Pending Assignment"
        size="small"
        sx={{
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontWeight: 600,
          fontSize: "11px",
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton
                variant="rectangular"
                height={90}
                sx={{ borderRadius: "10px" }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton
          variant="rectangular"
          height={300}
          sx={{ borderRadius: "10px" }}
        />
      </Box>
    );
  }

  const { summary, history } = summaryData;

  return (
    <Box sx={{ p: 3 }}>

      {/* History Table */}
      {history.length === 0 ? (
        <NoResponsePage />
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: "none",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
          }}
        >
          <Table>
            <TableHead>
              <StyledTableRow sx={{ backgroundColor: "#f9fafb" }}>
                <StyledTableCell>DM Number</StyledTableCell>
                <StyledTableCell>Assigned Worker</StyledTableCell>
                <StyledTableCell>Fabric SKU</StyledTableCell>
                <StyledTableCell>Fabric Given (Meters)</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                <StyledTableCell>Created At</StyledTableCell>
                <StyledTableCell>Closed Date</StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </StyledTableRow>
            </TableHead>
            <TableBody>
              {history.map((row, index) => (
                <StyledTableRow key={row.deliveryMemoId}>
                  <StyledTableCell sx={{ fontWeight: 600, color: "#111827" }}>
                    {row.dmNumber}
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 600, color: "#374151" }}>
                    {row.workerName}
                  </StyledTableCell>
                  <StyledTableCell>{row.fabricSKU}</StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 600, color: "#059669" }}>
                    {row.fabricGiven} m
                  </StyledTableCell>
                  <StyledTableCell>
                    {getStatusChip(row.jobWorkStatus, row.memoStatus)}
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {moment(row.createdAt).format("DD/MM/YYYY HH:mm")}
                  </StyledTableCell>
                  <StyledTableCell
                    sx={{
                      fontSize: "12px",
                      color: row.closedAt ? "#059669" : "#9ca3af",
                      fontWeight: row.closedAt ? 500 : 400,
                    }}
                  >
                    {row.closedAt
                      ? moment(row.closedAt).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </StyledTableCell>
                  <StyledTableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(row.deliveryMemoId)}
                      sx={{ color: "#667eea" }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Memo Detail Drawer */}
      <MemoDetailDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        memo={selectedMemo}
        title="Job Work History Details"
      />
    </Box>
  );
}
