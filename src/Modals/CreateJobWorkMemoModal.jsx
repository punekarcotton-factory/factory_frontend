import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Alert,
  Autocomplete,
  CircularProgress,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WorkIcon from "@mui/icons-material/Work";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../Slice/snackbarSlice";
import axiosInstance from "../utils/axiosInstance";

const CreateJobWorkMemoModal = ({ open, onClose, onMemoCreated, currentUser }) => {
  const dispatch = useDispatch();

  const [fabricSKUs, setFabricSKUs] = useState([]);
  const [loadingFabrics, setLoadingFabrics] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState(null);

  const [fabricGiven, setFabricGiven] = useState("");
  const [dmNumber, setDmNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      "& fieldset": {
        borderColor: "#e5e7eb",
      },
      "&:hover fieldset": {
        borderColor: "#667eea",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#667eea",
        borderWidth: "1.5px",
      },
    },
  };

  const generateDmNumber = () => {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(100 + Math.random() * 900);
    return `JW-${timestamp}${random}`;
  };

  useEffect(() => {
    if (!open) return;

    setError("");
    setSelectedFabric(null);
    setFabricGiven("");
    setNotes("");
    setDmNumber("");

    const fetchFabrics = async () => {
      setLoadingFabrics(true);
      try {
        const res = await axiosInstance.get("/delivery-memos/fabrics/available");
        setFabricSKUs(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load fabrics:", err);
      } finally {
        setLoadingFabrics(false);
      }
    };

    fetchFabrics();
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedFabric) {
      setError("Please select a Fabric SKU.");
      return;
    }

    const givenQty = parseFloat(fabricGiven);
    if (isNaN(givenQty) || givenQty <= 0) {
      setError("Please enter a valid fabric quantity in meters.");
      return;
    }

    if (givenQty > selectedFabric.quantity) {
      setError(
        `Quantity (${givenQty}m) exceeds available stock (${selectedFabric.quantity}m).`
      );
      return;
    }

    if (!dmNumber.trim()) {
      setError("Delivery Memo Number (DM Number) is required.");
      return;
    }

    const userId = currentUser?.id || currentUser?._id || currentUser?.userId || "system";

    setSubmitting(true);

    try {
      const payload = {
        memos: [
          {
            fabricSKU: selectedFabric.sku,
            dhap: String(givenQty),
            fold: "1",
            totalDhapFold: givenQty,
          },
        ],
        dmNumber: dmNumber.trim(),
        createdBy: String(userId),
        stage: "JOB_WORK",
        isJobWork: true,
        jobWorkWorkerId: null,
        jobWorkWorkerName: null,
        jobWorkStatus: "PENDING",
        fabricGiven: givenQty,
        fabricSKU: selectedFabric.sku,
        notes: notes.trim(),
      };

      await axiosInstance.post("/delivery-memos", payload);

      dispatch(
        showSnackbar({
          open: true,
          severity: "success",
          message: "Job Work Delivery Memo created successfully!",
        })
      );

      if (onMemoCreated) onMemoCreated();
      onClose();
    } catch (err) {
      console.error("Error creating Job Work memo:", err);
      setError(
        err.response?.data?.message || "Failed to create Job Work Delivery Memo."
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
        sx: {
          borderRadius: "16px",
          p: 1,
        },
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
            <WorkIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} fontSize="18px">
              Create Job Work Memo
            </Typography>
            <Typography variant="body2" color="text.secondary" fontSize="12px">
              Allocate fabric to create a new Job Work Delivery Memo
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* DM Number */}
        <TextField
          label="DM Number"
          value={dmNumber}
          onChange={(e) => setDmNumber(e.target.value)}
          fullWidth
          required
          placeholder="e.g. JW-1001"
          sx={textFieldStyle}
        />

        {/* Select Fabric */}
        <Autocomplete
          options={fabricSKUs}
          getOptionLabel={(option) =>
            `${option.sku} - ${option.title || "Fabric"} (${option.color || "N/A"}) [Avail: ${option.quantity}m]`
          }
          value={selectedFabric}
          onChange={(event, newValue) => setSelectedFabric(newValue)}
          loading={loadingFabrics}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Fabric SKU"
              placeholder="Search fabric SKU"
              required
              sx={textFieldStyle}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loadingFabrics ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />

        {/* Fabric Given */}
        <TextField
          label="Fabric Quantity Given (Meters)"
          type="number"
          value={fabricGiven}
          onChange={(e) => setFabricGiven(e.target.value)}
          fullWidth
          required
          placeholder="e.g. 50"
          helperText={
            selectedFabric ? `Available: ${selectedFabric.quantity} meters` : ""
          }
          inputProps={{ min: 0.1, step: 0.1 }}
          sx={textFieldStyle}
        />

        {/* Notes */}
        <TextField
          label="Notes / Instructions (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Add any specific instructions for job work..."
          sx={textFieldStyle}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            color: "#4b5563",
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#ffffff",
            px: 3,
            fontWeight: 600,
            "&:hover": {
              background: "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
            },
          }}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : "Create Memo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateJobWorkMemoModal;
