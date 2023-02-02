import click
from common.document_parser import validators
import pandas as pd
from pathlib import Path
from . import get_default_logger
import sys
import resource
import platform
import shutil


@click.group()
def cli():
    """
    Document parsing tool
    """
    pass


def pdf_to_json(
        parser_path: str,
        source: str,
        destination: str,
        verify: bool = False,
        metadata: str = None,
        multiprocess: int = -1,
        ocr_missing_doc: bool = False,
        force_ocr: bool = False,
        num_ocr_threads: int = 2,
) -> None:
    """
    Converts input pdf file to json
    Args:
        parser_path: path to parser module or json config file that creates a parser
        source: A source directory to be processed.
        destination: A destination directory to be processed
        verify: Boolean to determine if output jsons are to be verified vs a json schema
        metadata: file path of metadata to be processed.
        multiprocess: Multiprocessing. Will take integer for number of cores,
        ocr_missing_doc: OCR non-OCR'ed files
        num_ocr_threads: Number of threads to use for OCR (per file)
    """
    from common.document_parser.process import process_dir, single_process, resolve_dynamic_parser

    parser = resolve_dynamic_parser(parser_path)

    doc_logger = get_default_logger()
    if Path(source).is_file():
        doc_logger.info("Parsing Single Document")

        parser_input = (
            parser,
            source,
            metadata,
            ocr_missing_doc,
            num_ocr_threads,
            force_ocr,
            destination)

        single_process(parser_input)

    else:
        process_dir(
            parser,
            dir_path=source,
            out_dir=destination,
            meta_data=metadata,
            multiprocess=multiprocess,
            ocr_missing_doc=ocr_missing_doc,
            force_ocr=force_ocr,
            num_ocr_threads=num_ocr_threads
        )
    if verify:
        verified = validators.verify(destination)
        if verified:
            print("Jsons are verified")
        else:
            print("Jsons do not match the schema")
            exit(1)


@cli.command(name="pdf-to-json")
@click.option(
    '--parser-path',
    help='A path to an existing parser function',
    required=False,
    default="common.document_parser.parsers.policy_analytics.parse::parse"
)
@click.option(
    '-v',
    '--verify',
    is_flag=True,
    help='verify the created json files vs a json schema',
    default=False,
)
@click.option(
    '-s',
    '--source',
    help='A source directory to be processed.',
    type=click.Path(resolve_path=True, exists=True),
    required=True,
)
@click.option(
    '-d',
    '--destination',
    required=True,
    type=click.Path(exists=True, file_okay=False,
                    dir_okay=True, resolve_path=True),
    help='A destination directory to be processed.',
)
@click.option(
    '-m',
    '--metadata',
    help='Meta data from ingestion can be passed here as a json file, '
         + 'or pass same directory as pdfs if meta data is available there. '
         + 'Looks for matching *.metadata if directory',
    type=click.Path(exists=True, file_okay=True,
                    dir_okay=True, resolve_path=True),
    default=None,
)
@click.option(
    '-p',
    '--multiprocess',
    required=False,
    default=-1,
    type=int,
    help="Multiprocessing. If treated like flag, will do max cores available. \
                if treated like option will take integer for number of cores.",
)
@click.option(
    '-w',
    '--ocr-missing-doc',
    help="If the file is not OCR, it will OCR the file. Default is to do nothing.",
    is_flag=True
)
@click.option(
    '-f',
    '--force-ocr',
    help="Force OCR on every document. Default is to do nothing.",
    is_flag=True
)
@click.option(
    '-z',
    '--memory_percentage',
    required=False,
    default=0.8,
    type=float,
    help="Limited the maximum memory usage.",
)
@click.option(
    '--num-ocr-threads',
    default=2,
    type=int,
    help="Number of threads to use for OCR (per file)"
)
def pdf_to_json_cmd_wrapper(
        parser_path: str,
        source: str,
        destination: str,
        metadata: str,
        multiprocess: int,
        verify: bool,
        memory_percentage: float,
        ocr_missing_doc: bool,
        force_ocr: bool,
        num_ocr_threads: int,
) -> None:
    """Parse OCR'ed PDF files into JSON schema"""
    if platform.system() == "Linux":
        memory_limit(memory_percentage)

    pdf_to_json(
        parser_path=parser_path,
        source=source,
        destination=destination,
        verify=verify,
        metadata=metadata,
        multiprocess=multiprocess,
        ocr_missing_doc=ocr_missing_doc,
        force_ocr=force_ocr,
        num_ocr_threads=num_ocr_threads
    )


def memory_limit(memory_percentage: float):
    """
    limits the percentage of memory usage allowed
    Args:
        memory_percentage: the percent allowed as a float
    """
    soft, hard = resource.getrlimit(resource.RLIMIT_AS)
    print("Memory Hard Limit: " + str(hard) + " Soft Limit: " + str(soft) +
          " Maximum of percentage of memory use: " + str(memory_percentage))
    resource.setrlimit(resource.RLIMIT_AS, (get_memory()
                                            * 1024 * memory_percentage, hard))


def get_memory():
    """
    returns the free memory available
    """
    with open('/proc/meminfo', 'r') as mem:
        free_memory = 0
        for i in mem:
            sline = i.split()
            if str(sline[0]) in ('MemFree:', 'Buffers:', 'Cached:'):
                free_memory += int(sline[1])
    print("____________________ " + str(free_memory) + "____________________")
    return free_memory


def asrs_to_json(
        parser_path: str,
        source: str,
        destination: str,
        multiprocess: int = -1
) -> None:
    """
    Converts input pdf file to json
    Args:
        parser_path: path to parser module or json config file that creates a parser
        source: A source directory to be processed.
        destination: A destination directory to be processed
        multiprocess: Multiprocessing. Will take integer for number of cores
    """
    from common.document_parser.process import process_dir, single_process, resolve_dynamic_parser

    parser = resolve_dynamic_parser(parser_path)

    doc_logger = get_default_logger()
    if Path(source).is_file():
        doc_logger.info("Parsing Single Document")

        parser_input = (
            parser,
            source,
            destination)

        single_process(parser_input)

    else:
        process_dir(
            parser,
            dir_path=source,
            out_dir=destination,
            multiprocess=multiprocess
        )

@cli.command(name="asrs-to-json")
@click.option(
    '--parser-path',
    help='A path to an existing parser function',
    required=False,
    default="common.document_parser.parsers.asrs.parse::parse"
)
@click.option(
    '-s',
    '--source',
    help='A source directory to be processed.',
    type=click.Path(resolve_path=True, exists=True),
    required=True,
)
@click.option(
    '-d',
    '--destination',
    required=True,
    type=click.Path(exists=True, file_okay=False,
                    dir_okay=True, resolve_path=True),
    help='A destination directory to be processed.',
)
@click.option(
    '-p',
    '--multiprocess',
    required=False,
    default=-1,
    type=int,
    help="Multiprocessing. If treated like flag, will do max cores available. \
                if treated like option will take integer for number of cores.",
)
@click.option(
    '-z',
    '--memory_percentage',
    required=False,
    default=0.8,
    type=float,
    help="Limited the maximum memory usage.",
)
def asrs_to_json_cmd_wrapper(
        parser_path: str,
        source: str,
        destination: str,
        multiprocess: int,
        memory_percentage: int
) -> None:
    """Parse OCR'ed PDF files into JSON schema"""
    if platform.system() == "Linux":
        memory_limit(memory_percentage)

    asrs_to_json(
        parser_path=parser_path,
        source=source,
        destination=destination,
        multiprocess=multiprocess
    )



def im_to_json(
        parser_path: str,
        source: str,
        destination: str,
        multiprocess: int = -1
) -> None:
    """
    Converts input pdf file to json
    Args:
        parser_path: path to parser module or json config file that creates a parser
        source: A source directory to be processed.
        destination: A destination directory to be processed
        multiprocess: Multiprocessing. Will take integer for number of cores
    """
    from common.document_parser.process import process_dir, single_process, resolve_dynamic_parser

    parser = resolve_dynamic_parser(parser_path)

    doc_logger = get_default_logger()
    if Path(source).is_file():
        doc_logger.info("Parsing Single Document")

        parser_input = (
            parser,
            source,
            destination)

        single_process(parser_input)

    else:
        process_dir(
            parser,
            dir_path=source,
            out_dir=destination,
            multiprocess=multiprocess
        )

@cli.command(name="im-to-json")
@click.option(
    '--parser-path',
    help='A path to an existing parser function',
    required=False,
    default="common.document_parser.parsers.im.parse::parse"
)
@click.option(
    '-s',
    '--source',
    help='A source directory to be processed.',
    type=click.Path(resolve_path=True, exists=True),
    required=True,
)
@click.option(
    '-d',
    '--destination',
    required=True,
    type=click.Path(exists=True, file_okay=False,
                    dir_okay=True, resolve_path=True),
    help='A destination directory to be processed.',
)
@click.option(
    '-p',
    '--multiprocess',
    required=False,
    default=-1,
    type=int,
    help="Multiprocessing. If treated like flag, will do max cores available. \
                if treated like option will take integer for number of cores.",
)
@click.option(
    '-z',
    '--memory_percentage',
    required=False,
    default=0.8,
    type=float,
    help="Limited the maximum memory usage.",
)
def im_to_json_cmd_wrapper(
        parser_path: str,
        source: str,
        destination: str,
        multiprocess: int,
        memory_percentage: int
) -> None:
    """Parse OCR'ed PDF files into JSON schema"""
    if platform.system() == "Linux":
        memory_limit(memory_percentage)

    im_to_json(
        parser_path=parser_path,
        source=source,
        destination=destination,
        multiprocess=multiprocess
    )