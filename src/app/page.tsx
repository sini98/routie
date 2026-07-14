"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarDays, Copy, Folder, Navigation, PencilLine, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import HomeMenuCard from "@/components/HomeMenuCard";
import RecentOutingCard from "@/components/RecentOutingCard";
import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { useRecentOutings, type RecentOuting } from "@/hooks/useOutings";

export default function Home() {
  const router = useRouter();
  const { recentOutings, isLoaded, deleteOuting, duplicateOuting } = useRecentOutings();
  const [menuFor, setMenuFor] = useState<RecentOuting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecentOuting | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const handleContinue = () => {
    if (menuFor) router.push(`/outing/${menuFor.date}`);
    setMenuFor(null);
  };

  const handleDuplicate = () => {
    if (menuFor) {
      duplicateOuting(menuFor.date);
      showToast(`"${menuFor.title}" 일정을 복제했어요`);
    }
    setMenuFor(null);
  };

  const handleRequestDelete = () => {
    setDeleteTarget(menuFor);
    setMenuFor(null);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteOuting(deleteTarget.date);
      showToast(`"${deleteTarget.title}" 일정을 삭제했어요`);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <Header />

      <div className="mt-6 flex shrink-0 flex-col gap-3 px-5">
        <HomeMenuCard
          href="/today"
          icon={Navigation}
          title="오늘 외출"
          description="오늘 하루의 동선을 지도로 확인해요"
        />
        <HomeMenuCard
          href="/calendar"
          icon={CalendarDays}
          title="지정 외출"
          description="원하는 날짜의 외출 일정을 만들어요"
        />
        <HomeMenuCard
          href="/favorites"
          icon={Bookmark}
          title="즐겨찾기"
          description="자주 가는 장소를 빠르게 추가해요"
        />
        <HomeMenuCard
          href="/routines"
          icon={Folder}
          title="루티 루틴"
          description="반복되는 외출을 템플릿으로 저장해요"
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2 px-5">
        <h2 className="shrink-0 px-1 text-sm font-semibold text-foreground">최근 작성한 일정</h2>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-6">
          {isLoaded && recentOutings.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">아직 작성한 일정이 없습니다.</p>
              <Link
                href="/today"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
              >
                새 일정 만들기
              </Link>
            </div>
          )}

          {recentOutings.map((outing) => (
            <RecentOutingCard key={outing.date} outing={outing} onOpenMenu={setMenuFor} />
          ))}
        </div>
      </div>

      <BottomSheet open={menuFor !== null} onOpenChange={(open) => !open && setMenuFor(null)} title={menuFor?.title ?? ""}>
        <div className="flex flex-col gap-2 pb-1">
          <Button type="button" variant="outline" className="justify-start" onClick={handleContinue}>
            <PencilLine className="h-4 w-4" />
            이어서 작성
          </Button>
          <Button type="button" variant="outline" className="justify-start" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
            일정 복제
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={handleRequestDelete}
          >
            <Trash2 className="h-4 w-4" />
            일정 삭제
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="정말 이 일정을 삭제하시겠습니까?"
      >
        <div className="flex flex-col gap-4 pb-1">
          <p className="text-sm text-muted-foreground">삭제된 일정은 복구할 수 없습니다.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button type="button" variant="destructive" className="flex-1" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </div>
        </div>
      </BottomSheet>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 z-30 mx-auto w-fit max-w-[90%] rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
            style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
