import { Box } from "@mui/material";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DeliveryMemoSidebar from "./Sidebar/DeliverMemoSidebar";
import { DELIVERY_MEMO_STAGES, DELIVERY_MEMO_STAGES_ARRAY } from "../utils/deliveryMemo";
import CreateDeliveryMemoStage from "./DeliveryMemoStages/CreateDeliveryMemoStage";
import CuttingStage from "./DeliveryMemoStages/CuttingStage";
import PreStitcherStage from "./DeliveryMemoStages/PreStitcherStage";
import JobWorkStage from "./DeliveryMemoStages/JobWorkStage";

const getStageFromPath = (path) => {
  const matchedStage = DELIVERY_MEMO_STAGES_ARRAY.find((s) => {
    const stageRoute = `/delivery-memo/${s.key.toLowerCase().replace(/_/g, "-")}`;
    return path === stageRoute || path === stageRoute + "/";
  });
  return matchedStage ? matchedStage.key : DELIVERY_MEMO_STAGES.CREATE_DELIVERY_MEMO.key;
};

const DeliveryMemo = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeStage, setActiveStage] = useState(() => getStageFromPath(location.pathname));

  useEffect(() => {
    const stageFromUrl = getStageFromPath(location.pathname);
    setActiveStage(stageFromUrl);
  }, [location.pathname]);

  const handleStageChange = (stageKey) => {
    setActiveStage(stageKey);
    const stageObj = Object.values(DELIVERY_MEMO_STAGES).find((s) => s.key === stageKey);
    if (stageObj) {
      const targetRoute = `/delivery-memo/${stageObj.key.toLowerCase().replace(/_/g, "-")}`;
      navigate(targetRoute);
    }
  };

  const renderStageContent = () => {
    switch (activeStage) {
      case DELIVERY_MEMO_STAGES.CREATE_DELIVERY_MEMO.key:
        return <CreateDeliveryMemoStage />;
      case DELIVERY_MEMO_STAGES.CUTTING.key:
        return <CuttingStage />;
      case DELIVERY_MEMO_STAGES.ASSIGN_PRE_STITCHER.key:
        return <PreStitcherStage />;
      case DELIVERY_MEMO_STAGES.ADMIN_ASSIGN_TAILOR.key:
        return <Box>Admin Assign Tailor Stage - Coming Soon</Box>;
      case DELIVERY_MEMO_STAGES.KANCH_BUTTON.key:
        return <Box>Kanch Button Stage - Coming Soon</Box>;
      case DELIVERY_MEMO_STAGES.JOB_WORK.key:
        return <JobWorkStage />;
      case DELIVERY_MEMO_STAGES.FINAL_INSPECTION.key:
        return <Box>Final Inspection Stage - Coming Soon</Box>;
      default:
        return <CreateDeliveryMemoStage />;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        height: "100%",
        backgroundColor: "#f9fafb",
        overflow: "hidden",
      }}
    >
      <DeliveryMemoSidebar
        activeStage={activeStage}
        onStageChange={handleStageChange}
      />

      <Box
        sx={{
          flex: 1,
          p: 1.5,
          overflowY: "auto",
        }}
      >
        {renderStageContent()}
      </Box>
    </Box>
  );
};

export default DeliveryMemo;
 