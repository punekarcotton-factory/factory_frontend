import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useDispatch } from "react-redux";
import { CreateButton } from "../components/Styled";
import { showSnackbar } from "../Slice/snackbarSlice";
import axiosInstance from "../utils/axiosInstance";

const AssignJobWorkerDialog = ({
  open,
  onClose,
  memo,
  onSuccess,
  currentUser,
}) => {
  const dispatch = useDispatch();

  const [workerName, setWorkerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const textFieldStyle = {
    "& .MuiInputBase-root": {
      fontSize: "14px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
    },
    "& .MuiInputLabel-root": {
      fontSize: "14px",
      color: "#6b7280",
    },
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "#e5e7eb" },
      "&:hover fieldset": { borderColor: "#667eea" },
      "&.Mui-focused fieldset": { borderColor: "#667eea", borderWidth: "1.5px" },
    },
  };

  useEffect(() => {
    if (open) {
      setWorkerName("");
      setPhoneNumber("");
      setFormErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const errors = {};
    if (!workerName.trim()) {
      errors.name = "Worker Name is required";
    }
    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Phone Number is required";
    } else if (phoneNumber.trim().length !== 10) {
      errors.phoneNumber = "Phone Number must be 10 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAssign = async () => {
    if (!validateForm()) return;
    if (!memo) return;

    setSubmitting(true);

    try {
      const memoId = memo.deliveryMemoId || memo._id;
      const userId = currentUser?.id || currentUser?._id || currentUser?.userId || "system";

      await axiosInstance.post(`/delivery-memos/${memoId}/assign-job-worker`, {
        workerName: workerName.trim(),
        workerPhone: phoneNumber.trim(),
        performedBy: String(userId),
      });

      dispatch(
        showSnackbar({
          open: true,
          severity: "success",
          message: `Worker "${workerName.trim()}" assigned & moved to In Process!`,
        })
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error assigning worker:", err);
      dispatch(
        showSnackbar({
          open: true,
          severity: "error",
          message: err.response?.data?.message || "Failed to assign worker to Job Work memo.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 1 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              backgroundColor: "#eef2ff",
              color: "#4f46e5",
              p: 1,
              borderRadius: "10px",
              display: "flex",
            }}
          >
            <PersonAddIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} fontSize="18px">
              Assign Job Worker
            </Typography>
            <Typography variant="body2" color="text.secondary" fontSize="12px">
              Assign worker for memo: {memo?.dmNumber || "Job Work Memo"}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Worker Name"
          value={workerName}
          onChange={(e) => {
            const value = e.target.value.replace(/[0-9]/g, "");
            setWorkerName(value);
          }}
          error={!!formErrors.name}
          helperText={formErrors.name}
          fullWidth
          required
          autoFocus
          placeholder="Enter worker full name"
          sx={textFieldStyle}
        />

        <TextField
          label="Phone Number"
          value={phoneNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            if (value.length <= 10) {
              setPhoneNumber(value);
            }
          }}
          error={!!formErrors.phoneNumber}
          helperText={formErrors.phoneNumber || "Enter 10-digit mobile number"}
          fullWidth
          required
          placeholder="Enter 10 digit number"
          sx={textFieldStyle}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: "none", color: "#4b5563" }}
        >
          Cancel
        </Button>
        <CreateButton
          onClick={handleAssign}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Assigning..." : "Assign Worker"}
        </CreateButton>
      </DialogActions>
    </Dialog>
  );
};

export default AssignJobWorkerDialog;
