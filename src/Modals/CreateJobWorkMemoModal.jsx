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
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WorkIcon from "@mui/icons-material/Work";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../Slice/snackbarSlice";
import axiosInstance from "../utils/axiosInstance";

const EMPTY_ENTRY = () => ({ fabricSKU: "", fabricGiven: "", notes: "" });

const CreateJobWorkMemoModal = ({ open, onClose, onMemoCreated, currentUser }) => {
  const dispatch = useDispatch();

  const [fabricSKUs, setFabricSKUs] = useState([]);
  const [loadingFabrics, setLoadingFabrics] = useState(false);
  const [dmNumber, setDmNumber] = useState("");
  const [entries, setEntries] = useState([EMPTY_ENTRY()]);
  const [expandedIndex, setExpandedIndex] = useState(0);
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
      "& fieldset": { borderColor: "#e5e7eb" },
      "&:hover fieldset": { borderColor: "#667eea" },
      "&.Mui-focused fieldset": {
        borderColor: "#667eea",
        borderWidth: "1.5px",
      },
    },
  };

  useEffect(() => {
    if (!open) return;

    setError("");
    setDmNumber("");
    setEntries([EMPTY_ENTRY()]);
    setExpandedIndex(0);

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

  // ─── Entry helpers ───────────────────────────────────────────────────────────

  const getSelectedFabric = (sku) => fabricSKUs.find((f) => f.sku === sku) || null;

  const getAvailableSKUsForEntry = (currentIndex) => {
    const usedSKUs = entries
      .map((e, idx) => (idx !== currentIndex ? e.fabricSKU : null))
      .filter(Boolean);
    return fabricSKUs.filter((f) => !usedSKUs.includes(f.sku));
  };

  const isEntryComplete = (entry) =>
    entry.fabricSKU && entry.fabricGiven;

  const handleEntryChange = (index, field, value) => {
    if (field === "fabricSKU" && value) {
      const isDuplicate = entries.some(
        (e, idx) => idx !== index && e.fabricSKU === value
      );
      if (isDuplicate) {
        setError(`SKU "${value}" is already added. Please select a different SKU.`);
        return;
      }
    }
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (error) setError("");
  };

  const handleAddRow = () => {
    setEntries((prev) => [...prev, EMPTY_ENTRY()]);
    setExpandedIndex(entries.length); // expand newly added row
  };

  const handleRemoveRow = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
    } else if (expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleToggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!dmNumber.trim()) {
      setError("Delivery Memo Number (DM Number) is required.");
      return;
    }

    // Validate each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (!entry.fabricSKU) {
        setError(`Entry #${i + 1}: Please select a Fabric SKU.`);
        setExpandedIndex(i);
        return;
      }

      const givenQty = parseFloat(entry.fabricGiven);
      if (isNaN(givenQty) || givenQty <= 0) {
        setError(`Entry #${i + 1}: Please enter a valid fabric quantity (meters).`);
        setExpandedIndex(i);
        return;
      }

      const fabric = getSelectedFabric(entry.fabricSKU);
      if (fabric && givenQty > fabric.quantity) {
        setError(
          `Entry #${i + 1}: Quantity (${givenQty}m) exceeds available stock (${fabric.quantity}m) for ${entry.fabricSKU}.`
        );
        setExpandedIndex(i);
        return;
      }
    }

    // Duplicate SKU check across all entries
    const skuList = entries.map((e) => e.fabricSKU);
    const duplicates = skuList.filter((sku, i) => skuList.indexOf(sku) !== i);
    if (duplicates.length > 0) {
      setError(`Duplicate SKU(s) found: ${[...new Set(duplicates)].join(", ")}. Each SKU can only appear once.`);
      return;
    }

    const userId = currentUser?.id || currentUser?._id || currentUser?.userId || "system";

    setSubmitting(true);

    try {
      const memoItems = entries.map((entry) => {
        const qty = parseFloat(entry.fabricGiven);
        return {
          fabricSKU: entry.fabricSKU,
          dhap: String(qty),
          fold: "1",
          totalDhapFold: qty,
        };
      });

      // Use the first entry's fabric for top-level fields (backward-compat)
      const firstEntry = entries[0];
      const firstQty = parseFloat(firstEntry.fabricGiven);

      const payload = {
        memos: memoItems,
        dmNumber: dmNumber.trim(),
        createdBy: String(userId),
        stage: "JOB_WORK",
        isJobWork: true,
        jobWorkWorkerId: null,
        jobWorkWorkerName: null,
        jobWorkStatus: "PENDING",
        fabricGiven: firstQty,
        fabricSKU: firstEntry.fabricSKU,
        notes: entries.map((e) => e.notes?.trim()).filter(Boolean).join("; "),
      };

      await axiosInstance.post("/delivery-memos", payload);

      dispatch(
        showSnackbar({
          open: true,
          severity: "success",
          message: `${entries.length} Job Work Delivery Memo${entries.length > 1 ? "s" : ""} created successfully!`,
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

  const handleClose = () => {
    if (!submitting) onClose();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 1 },
      }}
    >
      {/* ── Header ── */}
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
              Allocate fabric to create Job Work Delivery Memo(s)
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={submitting}>
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

        {loadingFabrics && (
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={24} />
            <Typography sx={{ fontSize: "12px", color: "#6b7280", mt: 1 }}>
              Loading fabrics…
            </Typography>
          </Box>
        )}

        {!loadingFabrics && fabricSKUs.length === 0 && (
          <Alert severity="warning">
            No fabrics with available quantity found. Please add fabrics first.
          </Alert>
        )}

        {/* DM Number */}
        <Box>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#374151", mb: 1 }}>
            DM Number
          </Typography>
          <TextField
            placeholder="e.g. JW-1001"
            value={dmNumber}
            onChange={(e) => setDmNumber(e.target.value)}
            fullWidth
            required
            size="small"
            disabled={submitting}
            sx={textFieldStyle}
          />
        </Box>

        {/* ── Entries ── */}
        {entries.map((entry, index) => {
          const selectedFabric = getSelectedFabric(entry.fabricSKU);
          const givenQty = parseFloat(entry.fabricGiven || "0");
          const isComplete = isEntryComplete(entry);
          const isExpanded = expandedIndex === index;
          const availableSKUs = getAvailableSKUsForEntry(index);

          const hasInsufficientQty =
            selectedFabric &&
            !isNaN(givenQty) &&
            givenQty > 0 &&
            givenQty > selectedFabric.quantity;

          return (
            <Box
              key={index}
              sx={{
                border: `1px solid ${hasInsufficientQty ? "#fca5a5" : "#e5e7eb"}`,
                borderRadius: "10px",
                overflow: "hidden",
                transition: "all 0.2s",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Card header / collapsed summary */}
              <Box
                onClick={() => handleToggleExpand(index)}
                sx={{
                  p: 2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isExpanded ? "#f9fafb" : "transparent",
                  "&:hover": { backgroundColor: "#f9fafb" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                  {/* Index badge */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      backgroundColor: "#667eea",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>

                  {/* Summary text */}
                  <Box sx={{ flex: 1 }}>
                    {isComplete ? (
                      <>
                        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                          {entry.fabricSKU}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "#6b7280" }}>
                          {givenQty}m given
                          {selectedFabric ? ` — Avail: ${selectedFabric.quantity}m` : ""}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#6b7280" }}>
                        Job Work #{index + 1} — Click to fill details
                      </Typography>
                    )}
                  </Box>

                  {isComplete && !hasInsufficientQty && (
                    <CheckCircleIcon sx={{ fontSize: 20, color: "#16a34a" }} />
                  )}
                  {hasInsufficientQty && (
                    <Typography sx={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>
                      Exceeds stock
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {entries.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRow(index);
                      }}
                      disabled={submitting}
                      sx={{
                        color: "#ef4444",
                        "&:hover": { backgroundColor: "#fef2f2" },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    sx={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Expanded form fields */}
              <Collapse in={isExpanded}>
                <Box sx={{ p: 2, pt: 1.5, display: "flex", flexDirection: "column", gap: 2, backgroundColor: "#ffffff" }}>
                  {/* Fabric SKU */}
                  <Box>
                    <Typography sx={{ fontSize: "13px", fontWeight: 500, color: "#374151", mb: 0.75 }}>
                      Fabric SKU
                    </Typography>
                    <Autocomplete
                      options={availableSKUs}
                      getOptionLabel={(option) =>
                        typeof option === "string"
                          ? option
                          : `${option.sku} — ${option.title || "Fabric"} (${option.color || "N/A"}) [Avail: ${option.quantity}m]`
                      }
                      value={selectedFabric || null}
                      onChange={(_, newValue) => {
                        handleEntryChange(index, "fabricSKU", newValue?.sku || "");
                      }}
                      loading={loadingFabrics}
                      disabled={submitting || fabricSKUs.length === 0}
                      isOptionEqualToValue={(option, value) => option.sku === value?.sku}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search fabric SKU"
                          size="small"
                          required
                          sx={textFieldStyle}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingFabrics ? <CircularProgress color="inherit" size={16} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Fabric Given (meters) */}
                  <Box>
                    <Typography sx={{ fontSize: "13px", fontWeight: 500, color: "#374151", mb: 0.75 }}>
                      Fabric Quantity Given (Meters)
                    </Typography>
                    <TextField
                      type="number"
                      value={entry.fabricGiven}
                      onChange={(e) => handleEntryChange(index, "fabricGiven", e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                      required
                      size="small"
                      placeholder="e.g. 50"
                      helperText={
                        selectedFabric
                          ? hasInsufficientQty
                            ? `⚠ Exceeds available stock (${selectedFabric.quantity}m)`
                            : `Available: ${selectedFabric.quantity}m`
                          : ""
                      }
                      FormHelperTextProps={{
                        sx: { color: hasInsufficientQty ? "#ef4444" : "#6b7280" },
                      }}
                      inputProps={{ min: 0.1, step: 0.1 }}
                      disabled={submitting}
                      sx={textFieldStyle}
                    />
                  </Box>

                  {/* Notes */}
                  <Box>
                    <Typography sx={{ fontSize: "13px", fontWeight: 500, color: "#374151", mb: 0.75 }}>
                      Notes / Instructions (Optional)
                    </Typography>
                    <TextField
                      value={entry.notes}
                      onChange={(e) => handleEntryChange(index, "notes", e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      placeholder="Add any specific instructions for this job work…"
                      disabled={submitting}
                      sx={textFieldStyle}
                    />
                  </Box>
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {/* Add another row */}
        <Button
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddRow}
          disabled={submitting || fabricSKUs.length === 0}
          sx={{
            textTransform: "none",
            color: "#667eea",
            borderRadius: "8px",
            border: "1.5px dashed #667eea",
            py: 1,
            fontWeight: 600,
            fontSize: "13px",
            "&:hover": {
              backgroundColor: "#eef2ff",
              border: "1.5px dashed #4f46e5",
            },
          }}
          fullWidth
        >
          Add Another Job Work
        </Button>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={handleClose}
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
          disabled={submitting || loadingFabrics}
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
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            `Create ${entries.length > 1 ? `${entries.length} Memos` : "Memo"}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateJobWorkMemoModal;
