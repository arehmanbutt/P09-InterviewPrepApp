import { adminDb } from "@/firebase-admin"

export const getInterviewById = async (userid: string): Promise<Interview[] | null> => {

    const interviews = await adminDb
        .collection("interviews")
        .where("userId", "==", userid)
        .orderBy("createdAt", "desc")
        .get();

    
    const interviewList = interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Interview[];
    return interviewList.length > 0 ? interviewList as Interview[] : null;
}