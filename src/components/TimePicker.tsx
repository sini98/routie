"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import WheelColumn from "@/components/WheelColumn";

type TimePickerProps = {
  /** 24시간제 "HH:MM" 문자열, 또는 아직 안 골랐으면 빈 문자열. */
  value: string;
  onChange: (value: string) => void;
};

type Period = "오전" | "오후";
type Draft = { period: Period; hour12: number; minute: number };

const PERIODS: Period[] = ["오전", "오후"];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1); // 1~12
const MINUTES = Array.from({ length: 60 }, (_, index) => index); // 0~59

// 각 휠의 한 칸 높이(px) — 가운데 하이라이트 밴드 높이에도 씁니다. WheelColumn 기본값과
// 같은 값이라 WheelColumn에는 따로 넘기지 않습니다.
const ITEM_HEIGHT = 40;

function to24Hour(period: Period, hour12: number): number {
  if (period === "오전") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function toDraft(value: string): Draft {
  if (!value) return { period: "오전", hour12: 9, minute: 0 };
  const [hour24, minute] = value.split(":").map(Number);
  const period: Period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { period, hour12, minute };
}

function formatValue(value: string) {
  if (!value) return "";
  const { period, hour12, minute } = toDraft(value);
  return `${period} ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * 방문 시간 선택 UI. 네이티브 <input type="time">은 오전/오후 순서나 선택된 항목의
 * 색상을 커스터마이즈할 수 없어서(브라우저/OS가 그리는 위젯이라 우리 CSS가 안 먹힘),
 * 오전/오후 · 시 · 분 세 칸을 각각 세로로 스크롤해서 고르는 휠 피커를 Bottom Sheet 안에
 * 직접 구현합니다.
 */
export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));

  const openPicker = () => {
    setDraft(toDraft(value));
    setOpen(true);
  };

  const handleConfirm = () => {
    const hour24 = to24Hour(draft.period, draft.hour12);
    onChange(`${String(hour24).padStart(2, "0")}:${String(draft.minute).padStart(2, "0")}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-start" onClick={openPicker}>
        <Clock className="h-4 w-4" />
        {value ? formatValue(value) : "시간 선택"}
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen} title="방문 시간 선택">
        <div className="flex flex-col gap-4 pb-1">
          <div className="relative">
            {/* 가운데 선택 칸을 표시하는 고정 하이라이트 밴드. 휠이 스크롤되는 동안에도
                이 밴드 자체는 움직이지 않고, 그 아래로 값들이 지나갑니다. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-lg bg-accent"
              style={{ height: ITEM_HEIGHT }}
            />
            <div className="relative z-10 flex">
              <WheelColumn
                items={PERIODS}
                value={draft.period}
                onChange={(period) => setDraft((prev) => ({ ...prev, period }))}
                renderItem={(item) => item}
                ariaLabel="오전/오후"
              />
              <WheelColumn
                items={HOURS}
                value={draft.hour12}
                onChange={(hour12) => setDraft((prev) => ({ ...prev, hour12 }))}
                renderItem={(item) => String(item).padStart(2, "0")}
                ariaLabel="시"
              />
              <WheelColumn
                items={MINUTES}
                value={draft.minute}
                onChange={(minute) => setDraft((prev) => ({ ...prev, minute }))}
                renderItem={(item) => String(item).padStart(2, "0")}
                ariaLabel="분"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClear}>
              시간 선택 안 함
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirm}>
              확인
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
