#include "../SemanLib/SemStructureBuilder.h"
#include <string>
#include <sstream>

static CSemStructureBuilder SemBuilder;
extern void(*GlobalErrorMessage)(const string&);
void MyGlobalErrorMessage(const string& s) 
{
	throw CExpc (s);

}

static std::stringstream ss;


const char *byte_to_binary(int x)
{
    static char b[9];
    b[0] = '\0';

    int z;
    for (z = 128; z > 0; z >>= 1)
    {
        strcat(b, ((x & z) == z) ? "1" : "0");
    }

    return b;
}

string GetGramInfo (poses_mask_t Poses, QWORD Grammems )
{
	string Result;
	for (size_t i =0; i < sizeof(Poses)*8; i++)
	if ( (1<<i) &  Poses)
	{
		Result += (const char*)SemBuilder.m_RusStr.m_pData->GetRusGramTab()->GetPartOfSpeechStr(i);
		Result +=  " ";
	}
	Result += SemBuilder.m_RusStr.m_pData->GetRusGramTab()->GrammemsToStr(Grammems);
	return  Result;
}

void show_register (string& s, RegisterEnum Register)  {
    
    EngRusMakeLower(s);
    if (!s.empty())
        if (Register == UpLow)
            s[0] = rtoupper(s[0]);
        else 
            if (Register == UpUp)
                EngRusMakeUpper(s);
}
vector<string> words;

string GetWordStrOfNode (CRusSemStructure SS, int ssi, bool bOnlyWords = false)
{
	CRusSemNode&  Node = SS.m_Nodes[ssi];
    string NodeStr;
    if (bOnlyWords){
        if (Node.m_Words.size() > 1)
            NodeStr += "(";
        for (int i=0; i< Node.m_Words.size(); i++)
	    {
            string w = Node.m_Words[i].m_Word;
            show_register(w,Node.m_Words[i].m_CharCase);
		    NodeStr += w;
            if (i+1 < Node.m_Words.size())
                NodeStr += " ";
        }
        if (Node.m_Words.size() > 1)
            NodeStr += ")";
     
    }
    else
    {
		if ( Node.m_Words.size() == 0 || Node.m_Words[0].m_Word != SemBuilder.m_RusStr.GetNodeStr1(ssi)){
			std::string a = SemBuilder.m_RusStr.GetNodeStr1(ssi);
			printf("\"other\": \"%s\"", a.c_str());
			if(Node.m_Words.size() != 0)
				printf(",");
			NodeStr += SemBuilder.m_RusStr.GetNodeStr1(ssi) + ": ";
		}
	    for (int i=0; i< Node.m_Words.size(); i++)
	    {
		    const CRusSemWord& Word = Node.m_Words[i];
			if( !( i==0 && Word.m_Word != SemBuilder.m_RusStr.GetNodeStr1(ssi)) ) {
				std::string a = Word.m_Word;
				printf("\"word\": \"%s\", ", a.c_str());
			}

			std::string lemma =  Word.m_Lemma;
			std::string part =  GetGramInfo(Word.m_Poses, Word.GetAllGrammems());
			printf("\"lemma\": \"%s\", \"part\": \"%s\"", lemma.c_str(), part.c_str());
		}
		if(Node.m_PrepWordNo >= 0 ) 
		{
			NodeStr = SS.m_piSent->m_Words[Node.m_PrepWordNo].m_strWord + " " + NodeStr;
		}
		if(!NodeStr.empty()) {

			NodeStr += " -> "; // Отредакт. морф. информация:
		}
		NodeStr += GetGramInfo(Node.GetNodePoses(), Node.GetGrammems());
		if (!Node.m_AntecedentStr.empty())
		{
			NodeStr += " anteced=" + Node.m_AntecedentStr;
		}
	}

	return NodeStr;
};

/*Use in .NET to import dll:
[DllImport(dll)]
static extern int InitDicts();
[DllImport(dll)]
static extern string FindSituations(string s);*/


#ifdef WIN32
extern "C" __declspec(dllexport) int __stdcall InitDicts()
#else
int InitDicts()
#endif
{
	try {
		if (!SemBuilder.m_RusStr.m_pData->Init())
		{
			fprintf (stderr, "cannot initialize presemantic dictionaries.\n");
			return 1;
		}
		SemBuilder.m_RusStr.m_pData->Initialize();
		SemBuilder.m_RusStr.m_pData->InitializeIndices();
		SemBuilder.m_bShouldBuildTclGraph = false;
	}
	catch(...)
	{
		printf ("general initialize exception");
		return 1;
	}
	return 0;
} 

static char res [10000];
#ifdef WIN32
extern "C" __declspec(dllexport) char* __stdcall FindSituations(char* Source)
#else
char * FindSituations(const char * Source)
#endif
{
	string r;
	string ResGraph;
	SemBuilder.m_RusStr.m_pData->GetSynan()->SetKillHomonymsMode(CoverageKillHomonyms);//DontKillHomonyms CoverageKillHomonyms
	SemBuilder.FindSituations(Source,0,"общ",20000,-1,"", ResGraph);
	words.resize(SemBuilder.m_RusStr.m_piSent->m_Words.size());
	for (int i = 0; i < SemBuilder.m_RusStr.m_piSent->m_Words.size(); i++)
		words[i] = SemBuilder.m_RusStr.m_piSent->m_Words[i].m_strWord;
	printf ("{\"nodes\": [");
	for (int i = 0; i < SemBuilder.m_RusStr.m_Nodes.size(); i++)
	{
		printf("{ \"num\": %i, ", i);
		string Nstr = GetWordStrOfNode(SemBuilder.m_RusStr, i);
		printf("}");
		if(i != SemBuilder.m_RusStr.m_Nodes.size() - 1)
			printf(",");
    }
	printf("],");

	printf ("\"relations\": [");
	for (int i = 0; i < SemBuilder. m_RusStr.m_Relations.size(); i++)
	{
		const CRusSemRelation& R = SemBuilder.m_RusStr.m_Relations[i];
		long m_TargetNodeNo = R.m_Valency.m_Direction == C_A && !R.m_bReverseRel ? R.m_SourceNodeNo : R.m_TargetNodeNo;
		long m_SourceNodeNo = !(R.m_Valency.m_Direction == C_A && !R.m_bReverseRel) ? R.m_SourceNodeNo : R.m_TargetNodeNo;

		if (!R.m_Valency.m_RelationStr.empty()) {
			printf ("{\"type\": \"%s\", \"l\": \"%s\", \"r\": \"%s\", \"con_type\": \"%s\", \"lnum\": %i, \"rnum\": %i }", 
				R.m_Valency.m_RelationStr.c_str(), 
				SemBuilder.m_RusStr.GetNodeStr1(m_TargetNodeNo).c_str(), 
	           SemBuilder.m_RusStr.GetNodeStr1(m_SourceNodeNo).c_str(),
				R.m_SyntacticRelation.c_str(),
	           m_TargetNodeNo,
	           m_SourceNodeNo);
			if(i != SemBuilder. m_RusStr.m_Relations.size() - 1)
				printf(",");
		}

	};
	printf("]}");
	if (SemBuilder.m_RusStr.m_DopRelations.size() > 0)
	{
		for (int i = 0; i < SemBuilder.m_RusStr.m_DopRelations.size(); i++)
		{
			const CRusSemRelation& R = SemBuilder.m_RusStr.m_DopRelations[i];
			long m_TargetNodeNo = R.m_Valency.m_Direction == C_A && !R.m_bReverseRel ? R.m_SourceNodeNo : R.m_TargetNodeNo;
			long m_SourceNodeNo = !(R.m_Valency.m_Direction == C_A && !R.m_bReverseRel) ? R.m_SourceNodeNo : R.m_TargetNodeNo;
		}
	}
	for (int i = 0; i < words.size(); i++) 
		if (words[i]!="")
			r += words[i] + " ";

	if(log_fp != 0) { fclose(log_fp); log_fp = 0; }

	res[r.size()]=0;
	strcpy(res, r.c_str());
	
	return res;
}

int main(int argc, char* argv[])
{
	if (argc != 1)
	{
		fprintf (stderr, "TestSeman prints the best semantic relations for the input stream (www.aot.ru)\n");
		fprintf (stderr, "Usage:  TestSeman <input.txt >output.txt\n");
		return 1;
	};
	clock_t m_TimeSpan = clock();
	GlobalErrorMessage = MyGlobalErrorMessage;
	if(InitDicts()!=0) exit(1);

	char buffer[10000];
	size_t SentenceNo = 1;
	string Source;
	size_t LineCount = 0;
	while (fgets(buffer,  10000, stdin))
	{
		LineCount++;
		fflush(stderr);
		Source = buffer;
		int comment = 0;
		if ((comment = Source.find("//")) > -1) 
			Source = Source.substr(0, comment);
		rtrim(buffer);
		if (strlen(buffer) > 250)
		{
			fprintf (stderr, "skip the sentence of %i chars\n", strlen(buffer));
			continue;
		}
		if (strlen(buffer) == 0 || Source.length() == 0)
		{
			fprintf (stderr, "skip empty sentence\n");
			continue;
		}
		try 
		{
			FindSituations((char *)Source.c_str());
		} 
		catch(...)
		{
			fprintf (stderr, "an exception occurred(%i, %s)!\n", LineCount, buffer );
			printf ("!!!! an exception occurred(%i, %s)!\n", LineCount, buffer );

		}

	}
	return 0;
}