#!/bin/bash

run()
{
    $@;
    if [ "$?" -ne "0" ]; then
	  echo "Fail running $@ !";
	  exit 1;
    fi
}
check_executable()
{
    which $1;
    if [ "$?" -ne "0" ]; then
	  echo "cannot find $1. Install it";
	  exit 1;
    fi
}

DIR=`dirname $0`
pushd $DIR/Thirdparty/seman

export RML=`pwd`

make_tool="make -j4"
echo $* | grep -vq "\-\-VS" || make_tool="echo Skipping: make "

check_executable flex
check_executable bison

#compile struct dicts
run $make_tool -C $RML/Source/StructDictLoader mode=release
run $make_tool -C $RML/Source/GraphmatThick mode=release

#compile morphology
MORPHOLOGY_COMPONENTS="MorphGen TestLem FileLem"
for component in $MORPHOLOGY_COMPONENTS
do
  run $make_tool -C $RML/Source/$component mode=release
done

#compile synan
run $make_tool -C $RML/Source/TestSynan mode=release
run $make_tool -C $RML/Source/ConvertTrigramBinary mode=release
run $make_tool -C $RML/Source/SimpleGrammarPrecompiled mode=release
run $make_tool -C $RML/Source/SynanDaemon mode=release_thread

#compile seman
SEMAN="TestSeman AprDictGen asp_read deriv_read GenFreqDict StatDatBin WordDatBin GenSynDict"
for component in $SEMAN
do
  run $make_tool -C $RML/Source/$component mode=release
done

set -o errexit
set -o pipefail

for f in Obor Ross Aoss Collocs EngCollocs EngObor GerObor TimeRoss; do 
  run Bin/StructDictLoader FromTxt Dicts/$f/ross.txt  Dicts/$f
done;

run Bin/GraphmatThick Russian Test/Graphan/Rus/text.txt -gra gra
run cmp gra Test/Graphan/Rus/result.gra
run Bin/GraphmatThick German Test/Graphan/Ger/text1.txt -gra gra
run cmp gra Test/Graphan/Ger/result.gra

for f in Comp Fin Omni Loc ; do 
  run Bin/StructDictLoader FromTxt Thes/$f/Ross/ross.txt  Thes/$f/Ross
done;


MORPHOLOGY_LANGUAGES="Rus Ger Eng"
for language in $MORPHOLOGY_LANGUAGES
do
  run Bin/MorphGen Dicts/SrcMorph/$language.mwz Dicts/Morph/$language 5 3
done
run Bin/TestLem -sort -echo -noids -forms Russian <Test/Morph/Rus/test.txt | cmp - Test/Morph/Rus/result.txt
run Bin/TestLem -sort -echo -noids -forms German <Test/Morph/Ger/test.txt  | cmp - Test/Morph/Ger/result.txt
run Bin/TestLem -sort -echo -noids -forms English <Test/Morph/Eng/test.txt | cmp - Test/Morph/Eng/result.txt

d=Dicts/Trigram/full.rev/
run gzip -cd $d/base.lex.gz >$d/base.lex
run gzip -cd $d/base.ngram.gz >$d/base.ngram
run Bin/ConvertTrigramBinary  Dicts/Trigram/full.rev.config
run Bin/TestSynan Russian Test/Synan/Rus/test.txt | cmp - Test/Synan/Rus/result.txt

run Bin/SimpleGrammarPrecompiled German Source/SimpleGrammarPrecompiled/tests/test.grm 2>test_glr.log
run cmp test_glr.log Source/SimpleGrammarPrecompiled/tests/tests.log

#german syntax
GERMAN_SYNTAX="GerSynan/gformats.txt
SimpleGrammar/example.grm
SimpleGrammar/person.grm
"
for component in $GERMAN_SYNTAX
do
  run Bin/SimpleGrammarPrecompiled German Dicts/$component
done
run Bin/TestSynan German Test/Synan/Ger/test.txt | cmp - Test/Synan/Ger/result.txt  

run Bin/AprDictGen Dicts/SrcBinDict/dict2809.txt Dicts/BinDict/dict.bin > /dev/null
run Bin/asp_read Dicts/SrcBinDict/ASP.txt Dicts/BinDict/asp_dict.bin >/dev/null 2>/dev/null
run Bin/deriv_read Dicts/SrcBinDict/troiki_suff Dicts/BinDict/deriv_suff.bin  >/dev/null 2>/dev/null
run Bin/deriv_read Dicts/SrcBinDict/troiki_pref Dicts/BinDict/deriv_pref.bin  >/dev/null 2>/dev/null
for freq_dict in freq_comp freq_fin freq_hud; do
  run Bin/GenFreqDict Texts/$freq_dict.txt Dicts/BinDict/$freq_dict.bin Dicts/SrcBinDict/shira.txt > /dev/null 2> /dev/null
done;
for d in L C F; do 
  run Bin/StatDatBin  Russian  Dicts/SrcBinDict/StatData.rus -$d Dicts/Morph/Rus/;
  run Bin/StatDatBin  German   Dicts/SrcBinDict/StatData.ger -$d Dicts/Morph/Ger;
done;
for d in L C F; do
  run Bin/WordDatBin  Dicts/SrcBinDict/WordData.txt -$d Dicts/Morph/Rus/ >/dev/null
done;
run Bin/GenSynDict  Dicts/SrcBinDict/synonyms.txt Dicts/BinDict/synonyms.bin 2>/dev/null

echo All done.

popd